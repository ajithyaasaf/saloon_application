import { Injectable, Logger } from '@nestjs/common';
import { PurchaseOrderStatus, StockMovementType } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { SecurityUtil } from '../../../common/utils/security.util';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { CreateGoodsReceivedNoteDto } from '../dto/purchase-order.dto';
import { GoodsReceivedNoteEntity } from '../entities/purchase-order.entity';
import {
  GoodsReceivedCreatedEvent,
  GoodsReceivedVerifiedEvent,
  StockIncreasedEvent,
} from '../events/inventory-events.event';
import { InventoryStockRepository } from '../repositories/inventory-stock.repository';
import { GoodsReceivedNoteRepository, PurchaseOrderItemRepository, PurchaseOrderRepository } from '../repositories/purchase-order.repository';
import { StockMovementRepository } from '../repositories/stock-movement.repository';

@Injectable()
export class GoodsReceivedService {
  private readonly logger = new Logger(GoodsReceivedService.name);

  constructor(
    private readonly grnRepo: GoodsReceivedNoteRepository,
    private readonly poRepo: PurchaseOrderRepository,
    private readonly poItemRepo: PurchaseOrderItemRepository,
    private readonly stockRepo: InventoryStockRepository,
    private readonly movementRepo: StockMovementRepository,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBus: EventBusService,
  ) {}

  public async receiveGoods(dto: CreateGoodsReceivedNoteDto, actorUserId: string): Promise<GoodsReceivedNoteEntity> {
    const po = await this.poRepo.findById(dto.purchaseOrderId);
    if (!po || po.salonId !== dto.salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.PURCHASE_ORDER_NOT_FOUND, 'Purchase order not found for this salon');
    }

    if (po.status !== PurchaseOrderStatus.APPROVED && po.status !== PurchaseOrderStatus.PARTIAL_RECEIVED) {
      throw new BusinessException(ERROR_CODES.INVENTORY.INVALID_STATE, `Cannot receive goods against purchase order in status ${po.status}`);
    }

    if (!dto.items || dto.items.length === 0) {
      throw new ValidationException('GRN must contain at least one received item');
    }

    const poItems = await this.poItemRepo.findByPurchaseOrder(po.id);
    const poItemMap = new Map(poItems.map((item) => [item.id, item]));

    for (const item of dto.items) {
      const poItem = poItemMap.get(item.purchaseOrderItemId);
      if (!poItem) {
        throw new ValidationException(`Item ${item.purchaseOrderItemId} does not belong to purchase order`);
      }
      const pending = poItem.orderedQuantity - poItem.receivedQuantity;
      if (item.acceptedQuantity > pending) {
        throw new BusinessException(ERROR_CODES.INVENTORY.INVALID_STATE, `Accepted quantity (${item.acceptedQuantity}) exceeds pending quantity (${pending}) for item`);
      }
    }

    const grnCode = `GRN-${dto.salonId.slice(-4).toUpperCase()}-${Date.now().toString().slice(-6)}-${SecurityUtil.generateRandomToken(3).toUpperCase()}`;

    const { grn, movementsToPublish } = await this.transactionService.run(async (tx) => {
      const createdGRN = await this.grnRepo.create(dto, grnCode, actorUserId);
      const movements: any[] = [];

      for (const item of dto.items) {
        if (item.acceptedQuantity > 0) {
          await this.poItemRepo.updateReceivedQuantity(item.purchaseOrderItemId, item.acceptedQuantity);

          const existingStock = await this.stockRepo.findByVariant(dto.branchId, item.productVariantId, item.batchNumber);
          const prevQty = existingStock?.quantityOnHand ?? 0;
          const newQty = prevQty + item.acceptedQuantity;

          const stock = await this.stockRepo.upsertStock({
            salonId: dto.salonId,
            branchId: dto.branchId,
            productVariantId: item.productVariantId,
            batchNumber: item.batchNumber ?? 'DEFAULT_BATCH',
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
            quantityOnHand: item.acceptedQuantity,
          });

          const movementCode = `SM-${dto.salonId.slice(-4).toUpperCase()}-${Date.now().toString().slice(-6)}-${SecurityUtil.generateRandomToken(3).toUpperCase()}`;
          const movement = await this.movementRepo.create({
            movementCode,
            salonId: dto.salonId,
            branchId: dto.branchId,
            productVariantId: item.productVariantId,
            batchNumber: item.batchNumber ?? 'DEFAULT_BATCH',
            type: StockMovementType.PURCHASE_RECEIPT,
            quantity: item.acceptedQuantity,
            unitCostPrice: item.unitCostPrice,
            totalValue: item.acceptedQuantity * item.unitCostPrice,
            previousQuantity: prevQty,
            newQuantity: newQty,
            referenceType: 'GoodsReceivedNote',
            referenceId: createdGRN.id,
            notes: `Received via GRN ${grnCode}`,
            actorUserId,
          });

          movements.push({ stock, movement, quantityDelta: item.acceptedQuantity });
        }
      }

      const updatedPOItems = await this.poItemRepo.findByPurchaseOrder(po.id);
      const allReceived = updatedPOItems.every((item) => item.receivedQuantity >= item.orderedQuantity);
      const nextStatus = allReceived ? PurchaseOrderStatus.FULLY_RECEIVED : PurchaseOrderStatus.PARTIAL_RECEIVED;
      await this.poRepo.update(po.id, { status: nextStatus });

      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'INVENTORY_MANAGER',
        action: 'RECEIVE_GOODS',
        entityType: 'GoodsReceivedNote',
        entityId: createdGRN.id,
        newState: createdGRN as any,
      });

      return { grn: createdGRN, movementsToPublish: movements };
    });

    await this.cacheService.delete(`inventory:po:${po.id}`);

    await this.eventBus.publish(
      new GoodsReceivedCreatedEvent(
        {
          grnId: grn.id,
          grnCode: grn.grnCode,
          purchaseOrderId: grn.purchaseOrderId,
          salonId: grn.salonId,
          branchId: grn.branchId,
        },
        actorUserId,
      ),
    );

    for (const m of movementsToPublish) {
      await this.eventBus.publish(
        new StockIncreasedEvent(
          {
            inventoryStockId: m.stock.id,
            salonId: dto.salonId,
            branchId: dto.branchId,
            productVariantId: m.stock.productVariantId,
            quantityDelta: m.quantityDelta,
            newQuantityOnHand: m.stock.quantityOnHand,
            reason: `GRN_${grn.grnCode}`,
          },
          actorUserId,
        ),
      );
    }

    return new GoodsReceivedNoteEntity(grn as any);
  }

  public async getGRN(id: string, salonId: string): Promise<GoodsReceivedNoteEntity> {
    const grn = await this.grnRepo.findById(id);
    if (!grn || grn.salonId !== salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.GRN_NOT_FOUND, 'Goods received note not found');
    }
    return new GoodsReceivedNoteEntity(grn as any);
  }

  public async getGRNsByPurchaseOrder(purchaseOrderId: string, salonId: string): Promise<GoodsReceivedNoteEntity[]> {
    const po = await this.poRepo.findById(purchaseOrderId);
    if (!po || po.salonId !== salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.PURCHASE_ORDER_NOT_FOUND, 'Purchase order not found');
    }
    const grns = await this.grnRepo.findByPurchaseOrder(purchaseOrderId);
    return grns.map((g) => new GoodsReceivedNoteEntity(g as any));
  }

  public async verifyGRN(id: string, salonId: string, actorUserId: string): Promise<GoodsReceivedNoteEntity> {
    const grn = await this.grnRepo.findById(id);
    if (!grn || grn.salonId !== salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.GRN_NOT_FOUND, 'Goods received note not found');
    }

    const verified = await this.transactionService.run(async (tx) => {
      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'INVENTORY_MANAGER',
        action: 'VERIFY_GRN',
        entityType: 'GoodsReceivedNote',
        entityId: id,
        newState: grn as any,
      });
      return grn;
    });

    await this.eventBus.publish(
      new GoodsReceivedVerifiedEvent(
        {
          grnId: id,
          purchaseOrderId: grn.purchaseOrderId,
          salonId,
          branchId: grn.branchId,
        },
        actorUserId,
      ),
    );

    return new GoodsReceivedNoteEntity(verified as any);
  }
}
