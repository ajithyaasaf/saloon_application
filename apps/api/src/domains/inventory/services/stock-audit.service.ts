import { Injectable, Logger } from '@nestjs/common';
import { AuditStatus, StockMovementType } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { SecurityUtil } from '../../../common/utils/security.util';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { SearchAuditQueryDto } from '../dto/search-inventory.dto';
import { CreateStockAuditDto } from '../dto/stock-audit.dto';
import { StockAuditEntity } from '../entities/stock-audit.entity';
import { StockAuditCompletedEvent } from '../events/inventory-events.event';
import { InventoryStockRepository } from '../repositories/inventory-stock.repository';
import { StockAuditItemRepository, StockAuditRepository } from '../repositories/stock-audit.repository';
import { StockMovementRepository } from '../repositories/stock-movement.repository';

@Injectable()
export class StockAuditService {
  private readonly logger = new Logger(StockAuditService.name);

  constructor(
    private readonly auditRepo: StockAuditRepository,
    private readonly itemRepo: StockAuditItemRepository,
    private readonly stockRepo: InventoryStockRepository,
    private readonly movementRepo: StockMovementRepository,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBus: EventBusService,
  ) {}

  public async createAudit(dto: CreateStockAuditDto, actorUserId: string): Promise<StockAuditEntity> {
    if (!dto.items || dto.items.length === 0) {
      throw new ValidationException('Stock audit must contain at least one item');
    }

    for (const item of dto.items) {
      if (item.countedQuantity < 0) {
        throw new ValidationException('Counted quantity cannot be negative');
      }
    }

    const auditCode = `AUD-${dto.salonId.slice(-4).toUpperCase()}-${Date.now().toString().slice(-6)}-${SecurityUtil.generateRandomToken(3).toUpperCase()}`;

    const audit = await this.transactionService.run(async (tx) => {
      const created = await this.auditRepo.create(dto, auditCode, actorUserId);
      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'INVENTORY_MANAGER',
        action: 'CREATE_AUDIT',
        entityType: 'StockAudit',
        entityId: created.id,
        newState: created as any,
      });
      return created;
    });

    return new StockAuditEntity(audit as any);
  }

  public async startAudit(id: string, salonId: string, actorUserId: string): Promise<StockAuditEntity> {
    const audit = await this.auditRepo.findById(id);
    if (!audit || audit.salonId !== salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.AUDIT_NOT_FOUND, 'Stock audit not found');
    }

    if (audit.status !== AuditStatus.PLANNED) {
      throw new BusinessException(ERROR_CODES.INVENTORY.INVALID_STATE, 'Only planned audits can be started');
    }

    const updated = await this.auditRepo.updateStatus(id, AuditStatus.IN_PROGRESS, actorUserId);
    await this.cacheService.delete(`inventory:audit:${id}`);
    return new StockAuditEntity(updated as any);
  }

  public async completeAudit(id: string, salonId: string, actorUserId: string): Promise<StockAuditEntity> {
    const audit = await this.auditRepo.findById(id);
    if (!audit || audit.salonId !== salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.AUDIT_NOT_FOUND, 'Stock audit not found');
    }

    if (audit.status === AuditStatus.COMPLETED || audit.status === AuditStatus.CANCELLED) {
      throw new BusinessException(ERROR_CODES.INVENTORY.INVALID_STATE, `Cannot complete audit in status ${audit.status}`);
    }

    const items = await this.itemRepo.findByAudit(id);

    const completed = await this.transactionService.run(async (tx) => {
      for (const item of items) {
        const variance = item.countedQuantity - item.expectedQuantity;
        if (variance !== 0) {
          const stock = await this.stockRepo.findByVariant(audit.branchId, item.productVariantId, item.batchNumber);
          const currentQty = stock?.quantityOnHand ?? 0;
          const newQty = currentQty + variance;

          if (newQty < 0) {
            throw new BusinessException(ERROR_CODES.INVENTORY.NEGATIVE_STOCK, `Audit correction would cause negative stock for variant ${item.productVariantId}`);
          }

          if (stock) {
            await this.stockRepo.updateStock(stock.id, variance, stock.version);
          } else {
            await this.stockRepo.upsertStock({
              salonId,
              branchId: audit.branchId,
              productVariantId: item.productVariantId,
              batchNumber: item.batchNumber,
              quantityOnHand: item.countedQuantity,
            });
          }

          const movementCode = `SM-${salonId.slice(-4).toUpperCase()}-${Date.now().toString().slice(-6)}-${SecurityUtil.generateRandomToken(3).toUpperCase()}`;
          await this.movementRepo.create({
            movementCode,
            salonId,
            branchId: audit.branchId,
            productVariantId: item.productVariantId,
            batchNumber: item.batchNumber,
            type: StockMovementType.AUDIT_CORRECTION,
            quantity: variance,
            unitCostPrice: item.unitCostPrice,
            totalValue: Math.abs(variance * item.unitCostPrice),
            previousQuantity: currentQty,
            newQuantity: newQty,
            referenceType: 'StockAudit',
            referenceId: audit.id,
            notes: `Audit discrepancy correction. Expected: ${item.expectedQuantity}, Counted: ${item.countedQuantity}`,
            actorUserId,
          });
        }
      }

      const res = await this.auditRepo.updateStatus(id, AuditStatus.COMPLETED, actorUserId);
      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'SALON_OWNER',
        action: 'COMPLETE_AUDIT',
        entityType: 'StockAudit',
        entityId: id,
        previousState: audit as any,
        newState: res as any,
      });
      return res;
    });

    await this.cacheService.delete(`inventory:audit:${id}`);
    await this.eventBus.publish(
      new StockAuditCompletedEvent(
        {
          auditId: id,
          salonId,
          branchId: audit.branchId,
          conductedByUserId: actorUserId,
        },
        actorUserId,
      ),
    );

    return new StockAuditEntity(completed as any);
  }

  public async cancelAudit(id: string, salonId: string, actorUserId: string): Promise<StockAuditEntity> {
    const audit = await this.auditRepo.findById(id);
    if (!audit || audit.salonId !== salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.AUDIT_NOT_FOUND, 'Stock audit not found');
    }

    if (audit.status === AuditStatus.COMPLETED) {
      throw new BusinessException(ERROR_CODES.INVENTORY.INVALID_STATE, 'Cannot cancel an already completed audit');
    }

    const cancelled = await this.auditRepo.updateStatus(id, AuditStatus.CANCELLED, actorUserId);
    await this.cacheService.delete(`inventory:audit:${id}`);
    return new StockAuditEntity(cancelled as any);
  }

  public async getAudit(id: string, salonId: string): Promise<StockAuditEntity> {
    const cached = await this.cacheService.get<StockAuditEntity>(`inventory:audit:${id}`);
    if (cached) return new StockAuditEntity(cached);

    const audit = await this.auditRepo.findById(id);
    if (!audit || audit.salonId !== salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.AUDIT_NOT_FOUND, 'Stock audit not found');
    }

    const entity = new StockAuditEntity(audit as any);
    await this.cacheService.set(`inventory:audit:${id}`, entity, 900);
    return entity;
  }

  public async searchAudits(query: SearchAuditQueryDto): Promise<{ data: StockAuditEntity[]; total: number }> {
    const result = await this.auditRepo.search(query);
    return {
      data: result.data.map((a) => new StockAuditEntity(a as any)),
      total: result.total,
    };
  }
}
