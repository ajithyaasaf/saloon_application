import { Injectable, Logger } from '@nestjs/common';
import { AdjustmentReason, StockMovementType } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { SecurityUtil } from '../../../common/utils/security.util';
import { AuditService } from '../../../shared/audit/audit.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { CreateStockAdjustmentDto } from '../dto/stock-adjustment.dto';
import { StockAdjustmentEntity } from '../entities/stock-adjustment.entity';
import {
  StockAdjustmentApprovedEvent,
  StockAdjustmentRejectedEvent,
} from '../events/inventory-events.event';
import { InventoryStockRepository } from '../repositories/inventory-stock.repository';
import { StockAdjustmentItemRepository, StockAdjustmentRepository } from '../repositories/stock-adjustment.repository';
import { StockMovementRepository } from '../repositories/stock-movement.repository';

@Injectable()
export class StockAdjustmentService {
  private readonly logger = new Logger(StockAdjustmentService.name);

  constructor(
    private readonly adjustmentRepo: StockAdjustmentRepository,
    private readonly itemRepo: StockAdjustmentItemRepository,
    private readonly stockRepo: InventoryStockRepository,
    private readonly movementRepo: StockMovementRepository,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly eventBus: EventBusService,
  ) {}

  public async createAdjustment(dto: CreateStockAdjustmentDto, actorUserId: string): Promise<StockAdjustmentEntity> {
    if (!dto.items || dto.items.length === 0) {
      throw new ValidationException('Adjustment must have at least one item');
    }

    for (const item of dto.items) {
      if (item.actualQuantity < 0) {
        throw new ValidationException('Actual quantity cannot be negative');
      }
    }

    const adjustmentCode = `ADJ-${dto.salonId.slice(-4).toUpperCase()}-${Date.now().toString().slice(-6)}-${SecurityUtil.generateRandomToken(3).toUpperCase()}`;

    const adjustment = await this.transactionService.run(async (tx) => {
      const created = await this.adjustmentRepo.create(dto, adjustmentCode, actorUserId);
      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'INVENTORY_MANAGER',
        action: 'CREATE_ADJUSTMENT',
        entityType: 'StockAdjustment',
        entityId: created.id,
        newState: created as any,
      });
      return created;
    });

    return new StockAdjustmentEntity(adjustment as any);
  }

  public async approveAdjustment(id: string, salonId: string, actorUserId: string): Promise<StockAdjustmentEntity> {
    const adjustment = await this.adjustmentRepo.findById(id);
    if (!adjustment || adjustment.salonId !== salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.ADJUSTMENT_NOT_FOUND, 'Stock adjustment not found');
    }

    if (adjustment.status !== 'PENDING_APPROVAL') {
      throw new BusinessException(ERROR_CODES.INVENTORY.INVALID_STATE, 'Only pending adjustments can be approved');
    }

    const items = await this.itemRepo.findByAdjustment(id);

    const approved = await this.transactionService.run(async (tx) => {
      for (const item of items) {
        const delta = item.adjustmentQuantity;
        const stock = await this.stockRepo.findByVariant(adjustment.branchId, item.productVariantId, item.batchNumber);
        const currentQty = stock?.quantityOnHand ?? 0;
        const newQty = currentQty + delta;

        if (newQty < 0) {
          throw new BusinessException(ERROR_CODES.INVENTORY.NEGATIVE_STOCK, `Adjustment would cause negative inventory for variant ${item.productVariantId}`);
        }

        let movementType: StockMovementType;
        if (adjustment.reason === AdjustmentReason.DAMAGE) {
          movementType = StockMovementType.DAMAGE_WRITE_OFF;
        } else if (adjustment.reason === AdjustmentReason.EXPIRY) {
          movementType = StockMovementType.EXPIRY_WRITE_OFF;
        } else if (delta > 0) {
          movementType = StockMovementType.ADJUSTMENT_INCREASE;
        } else {
          movementType = StockMovementType.ADJUSTMENT_DECREASE;
        }

        if (stock) {
          await this.stockRepo.updateStock(stock.id, delta, stock.version, tx);
        } else {
          await this.stockRepo.upsertStock(
            {
              salonId,
              branchId: adjustment.branchId,
              productVariantId: item.productVariantId,
              batchNumber: item.batchNumber,
              quantityOnHand: item.actualQuantity,
            },
            tx,
          );
        }

        const movementCode = `SM-${salonId.slice(-4).toUpperCase()}-${Date.now().toString().slice(-6)}-${SecurityUtil.generateRandomToken(3).toUpperCase()}`;
        await this.movementRepo.create(
          {
            movementCode,
            salonId,
            branchId: adjustment.branchId,
            productVariantId: item.productVariantId,
            batchNumber: item.batchNumber,
            type: movementType,
            quantity: delta,
            unitCostPrice: item.unitCostPrice,
            totalValue: Math.abs(delta * item.unitCostPrice),
            previousQuantity: currentQty,
            newQuantity: newQty,
            referenceType: 'StockAdjustment',
            referenceId: adjustment.id,
            notes: `Reason: ${adjustment.reason}`,
            actorUserId,
          },
          tx,
        );
      }

      const updated = await this.adjustmentRepo.approve(id, actorUserId, tx);
      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'SALON_OWNER',
        action: 'APPROVE_ADJUSTMENT',
        entityType: 'StockAdjustment',
        entityId: id,
        previousState: adjustment as any,
        newState: updated as any,
      });
      return updated;
    });

    await this.eventBus.publish(
      new StockAdjustmentApprovedEvent(
        {
          adjustmentId: id,
          salonId,
          branchId: adjustment.branchId,
          approvedByUserId: actorUserId,
        },
        actorUserId,
      ),
    );

    return new StockAdjustmentEntity(approved as any);
  }

  public async rejectAdjustment(
    id: string,
    salonId: string,
    reason: string,
    actorUserId: string,
  ): Promise<StockAdjustmentEntity> {
    const adjustment = await this.adjustmentRepo.findById(id);
    if (!adjustment || adjustment.salonId !== salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.ADJUSTMENT_NOT_FOUND, 'Stock adjustment not found');
    }

    if (adjustment.status !== 'PENDING_APPROVAL') {
      throw new BusinessException(ERROR_CODES.INVENTORY.INVALID_STATE, 'Only pending adjustments can be rejected');
    }

    const rejected = await this.transactionService.run(async (tx) => {
      const res = await this.adjustmentRepo.reject(id, actorUserId, tx);
      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'SALON_OWNER',
        action: 'REJECT_ADJUSTMENT',
        entityType: 'StockAdjustment',
        entityId: id,
        previousState: adjustment as any,
        newState: res as any,
      });
      return res;
    });

    await this.eventBus.publish(
      new StockAdjustmentRejectedEvent(
        {
          adjustmentId: id,
          salonId,
          branchId: adjustment.branchId,
          rejectedByUserId: actorUserId,
        },
        actorUserId,
      ),
    );

    return new StockAdjustmentEntity(rejected as any);
  }

  public async getAdjustment(id: string, salonId: string): Promise<StockAdjustmentEntity> {
    const adjustment = await this.adjustmentRepo.findById(id);
    if (!adjustment || adjustment.salonId !== salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.ADJUSTMENT_NOT_FOUND, 'Stock adjustment not found');
    }
    return new StockAdjustmentEntity(adjustment as any);
  }

  public async getAdjustmentsByBranch(branchId: string): Promise<StockAdjustmentEntity[]> {
    const list = await this.adjustmentRepo.findByBranch(branchId);
    return list.map((a) => new StockAdjustmentEntity(a as any));
  }
}
