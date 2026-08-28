import { Injectable, Logger } from '@nestjs/common';
import { PurchaseOrderStatus } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { SecurityUtil } from '../../../common/utils/security.util';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderDto } from '../dto/purchase-order.dto';
import { PurchaseOrderEntity } from '../entities/purchase-order.entity';
import {
  PurchaseOrderApprovedEvent,
  PurchaseOrderCancelledEvent,
  PurchaseOrderCreatedEvent,
  PurchaseOrderSubmittedEvent,
} from '../events/inventory-events.event';
import { ProductVariantRepository } from '../repositories/product.repository';
import { PurchaseOrderRepository } from '../repositories/purchase-order.repository';
import { SupplierRepository } from '../repositories/supplier.repository';

@Injectable()
export class PurchaseOrderService {
  private readonly logger = new Logger(PurchaseOrderService.name);

  constructor(
    private readonly poRepo: PurchaseOrderRepository,
    private readonly supplierRepo: SupplierRepository,
    private readonly variantRepo: ProductVariantRepository,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBus: EventBusService,
  ) {}

  public async createPurchaseOrder(dto: CreatePurchaseOrderDto, actorUserId: string): Promise<PurchaseOrderEntity> {
    const supplier = await this.supplierRepo.findById(dto.supplierId);
    if (!supplier || supplier.salonId !== dto.salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.SUPPLIER_NOT_FOUND, 'Supplier not found for this salon');
    }

    if (!dto.items || dto.items.length === 0) {
      throw new ValidationException('Purchase order must contain at least one item');
    }

    for (const item of dto.items) {
      if (item.orderedQuantity <= 0) {
        throw new ValidationException('Ordered quantity must be greater than zero');
      }
      const variant = await this.variantRepo.findById(item.productVariantId);
      if (!variant) {
        throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.VARIANT_NOT_FOUND, `Product variant ${item.productVariantId} not found`);
      }
    }

    const poCode = `PO-${dto.salonId.slice(-4).toUpperCase()}-${Date.now().toString().slice(-6)}-${SecurityUtil.generateRandomToken(3).toUpperCase()}`;

    const po = await this.transactionService.run(async (tx) => {
      const created = await this.poRepo.create(dto, poCode);
      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'SALON_OWNER',
        action: 'CREATE',
        entityType: 'PurchaseOrder',
        entityId: created.id,
        newState: created as any,
      });
      return created;
    });

    await this.eventBus.publish(
      new PurchaseOrderCreatedEvent(
        {
          purchaseOrderId: po.id,
          poCode: po.poCode,
          salonId: po.salonId,
          branchId: po.branchId,
          supplierId: po.supplierId,
          totalAmount: po.totalAmount,
        },
        actorUserId,
      ),
    );

    return new PurchaseOrderEntity(po as any);
  }

  public async updatePurchaseOrder(
    id: string,
    salonId: string,
    dto: UpdatePurchaseOrderDto,
    actorUserId: string,
  ): Promise<PurchaseOrderEntity> {
    const existing = await this.poRepo.findById(id);
    if (!existing || existing.salonId !== salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.PURCHASE_ORDER_NOT_FOUND, 'Purchase order not found');
    }

    if (existing.status !== PurchaseOrderStatus.DRAFT) {
      throw new BusinessException(ERROR_CODES.INVENTORY.INVALID_STATE, 'Only draft purchase orders can be updated');
    }

    const updated = await this.transactionService.run(async (tx) => {
      const res = await this.poRepo.update(id, dto);
      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'SALON_OWNER',
        action: 'UPDATE',
        entityType: 'PurchaseOrder',
        entityId: id,
        previousState: existing as any,
        newState: res as any,
      });
      return res;
    });

    await this.cacheService.delete(`inventory:po:${id}`);
    return new PurchaseOrderEntity(updated as any);
  }

  public async submitPurchaseOrder(id: string, salonId: string, actorUserId: string): Promise<PurchaseOrderEntity> {
    const existing = await this.poRepo.findById(id);
    if (!existing || existing.salonId !== salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.PURCHASE_ORDER_NOT_FOUND, 'Purchase order not found');
    }

    if (existing.status !== PurchaseOrderStatus.DRAFT) {
      throw new BusinessException(ERROR_CODES.INVENTORY.INVALID_STATE, 'Only draft purchase orders can be submitted');
    }

    const submitted = await this.transactionService.run(async (tx) => {
      const res = await this.poRepo.update(id, { status: PurchaseOrderStatus.SUBMITTED });
      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'SALON_OWNER',
        action: 'SUBMIT',
        entityType: 'PurchaseOrder',
        entityId: id,
        previousState: existing as any,
        newState: res as any,
      });
      return res;
    });

    await this.cacheService.delete(`inventory:po:${id}`);
    await this.eventBus.publish(
      new PurchaseOrderSubmittedEvent(
        {
          purchaseOrderId: id,
          salonId,
          branchId: existing.branchId,
        },
        actorUserId,
      ),
    );

    return new PurchaseOrderEntity(submitted as any);
  }

  public async approvePurchaseOrder(id: string, salonId: string, actorUserId: string): Promise<PurchaseOrderEntity> {
    const existing = await this.poRepo.findById(id);
    if (!existing || existing.salonId !== salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.PURCHASE_ORDER_NOT_FOUND, 'Purchase order not found');
    }

    if (existing.status !== PurchaseOrderStatus.SUBMITTED && existing.status !== PurchaseOrderStatus.DRAFT) {
      throw new BusinessException(ERROR_CODES.INVENTORY.INVALID_STATE, 'Purchase order cannot be approved from current state');
    }

    const approved = await this.transactionService.run(async (tx) => {
      const res = await this.poRepo.update(id, { status: PurchaseOrderStatus.APPROVED });
      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'SALON_OWNER',
        action: 'APPROVE',
        entityType: 'PurchaseOrder',
        entityId: id,
        previousState: existing as any,
        newState: res as any,
      });
      return res;
    });

    await this.cacheService.delete(`inventory:po:${id}`);
    await this.eventBus.publish(
      new PurchaseOrderApprovedEvent(
        {
          purchaseOrderId: id,
          salonId,
          branchId: existing.branchId,
          approvedByUserId: actorUserId,
        },
        actorUserId,
      ),
    );

    return new PurchaseOrderEntity(approved as any);
  }

  public async cancelPurchaseOrder(
    id: string,
    salonId: string,
    reason: string,
    actorUserId: string,
  ): Promise<PurchaseOrderEntity> {
    const existing = await this.poRepo.findById(id);
    if (!existing || existing.salonId !== salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.PURCHASE_ORDER_NOT_FOUND, 'Purchase order not found');
    }

    if (
      existing.status === PurchaseOrderStatus.FULLY_RECEIVED ||
      existing.status === PurchaseOrderStatus.CANCELLED ||
      existing.status === PurchaseOrderStatus.REJECTED
    ) {
      throw new BusinessException(ERROR_CODES.INVENTORY.INVALID_STATE, 'Purchase order cannot be cancelled from current state');
    }

    const cancelled = await this.transactionService.run(async (tx) => {
      const res = await this.poRepo.update(id, { status: PurchaseOrderStatus.CANCELLED });
      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'SALON_OWNER',
        action: 'CANCEL',
        entityType: 'PurchaseOrder',
        entityId: id,
        previousState: existing as any,
        newState: res as any,
      });
      return res;
    });

    await this.cacheService.delete(`inventory:po:${id}`);
    await this.eventBus.publish(
      new PurchaseOrderCancelledEvent(
        {
          purchaseOrderId: id,
          salonId,
          branchId: existing.branchId,
          reason,
        },
        actorUserId,
      ),
    );

    return new PurchaseOrderEntity(cancelled as any);
  }

  public async rejectPurchaseOrder(
    id: string,
    salonId: string,
    reason: string,
    actorUserId: string,
  ): Promise<PurchaseOrderEntity> {
    const existing = await this.poRepo.findById(id);
    if (!existing || existing.salonId !== salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.PURCHASE_ORDER_NOT_FOUND, 'Purchase order not found');
    }

    if (existing.status !== PurchaseOrderStatus.SUBMITTED) {
      throw new BusinessException(ERROR_CODES.INVENTORY.INVALID_STATE, 'Only submitted purchase orders can be rejected');
    }

    const rejected = await this.transactionService.run(async (tx) => {
      const res = await this.poRepo.update(id, { status: PurchaseOrderStatus.REJECTED });
      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'SALON_OWNER',
        action: 'REJECT',
        entityType: 'PurchaseOrder',
        entityId: id,
        previousState: existing as any,
        newState: res as any,
      });
      return res;
    });

    await this.cacheService.delete(`inventory:po:${id}`);
    return new PurchaseOrderEntity(rejected as any);
  }

  public async getPurchaseOrder(id: string, salonId: string): Promise<PurchaseOrderEntity> {
    const cached = await this.cacheService.get<PurchaseOrderEntity>(`inventory:po:${id}`);
    if (cached) return new PurchaseOrderEntity(cached);

    const po = await this.poRepo.findById(id);
    if (!po || po.salonId !== salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.PURCHASE_ORDER_NOT_FOUND, 'Purchase order not found');
    }

    const entity = new PurchaseOrderEntity(po as any);
    await this.cacheService.set(`inventory:po:${id}`, entity, 900);
    return entity;
  }

  public async searchPurchaseOrders(
    salonId: string,
    branchId?: string,
    status?: string,
  ): Promise<{ data: PurchaseOrderEntity[]; total: number }> {
    const result = await this.poRepo.search(salonId, branchId, status);
    return {
      data: result.data.map((p) => new PurchaseOrderEntity(p as any)),
      total: result.total,
    };
  }
}
