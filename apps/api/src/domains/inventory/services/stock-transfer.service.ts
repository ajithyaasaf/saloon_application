import { Injectable, Logger } from '@nestjs/common';
import { StockMovementType, TransferStatus } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { SecurityUtil } from '../../../common/utils/security.util';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { SearchTransferQueryDto } from '../dto/search-inventory.dto';
import { CreateStockTransferDto } from '../dto/stock-transfer.dto';
import { StockTransferEntity } from '../entities/stock-transfer.entity';
import {
  StockTransferCreatedEvent,
  StockTransferDispatchedEvent,
  StockTransferReceivedEvent,
} from '../events/inventory-events.event';
import { InventoryStockRepository } from '../repositories/inventory-stock.repository';
import { StockMovementRepository } from '../repositories/stock-movement.repository';
import { StockTransferItemRepository, StockTransferRepository } from '../repositories/stock-transfer.repository';

@Injectable()
export class StockTransferService {
  private readonly logger = new Logger(StockTransferService.name);

  constructor(
    private readonly transferRepo: StockTransferRepository,
    private readonly itemRepo: StockTransferItemRepository,
    private readonly stockRepo: InventoryStockRepository,
    private readonly movementRepo: StockMovementRepository,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBus: EventBusService,
  ) {}

  public async createTransfer(dto: CreateStockTransferDto, actorUserId: string): Promise<StockTransferEntity> {
    if (dto.sourceBranchId === dto.destinationBranchId) {
      throw new ValidationException('Source and destination branches cannot be the same');
    }

    if (!dto.items || dto.items.length === 0) {
      throw new ValidationException('Stock transfer must contain at least one item');
    }

    for (const item of dto.items) {
      if (item.dispatchedQuantity <= 0) {
        throw new ValidationException('Dispatched quantity must be greater than zero');
      }
      const stock = await this.stockRepo.findByVariant(dto.sourceBranchId, item.productVariantId, item.batchNumber);
      if (!stock || stock.quantityOnHand < item.dispatchedQuantity) {
        throw new BusinessException(
          ERROR_CODES.INVENTORY.INSUFFICIENT_STOCK,
          `Insufficient stock at source branch for variant ${item.productVariantId}. Available: ${stock?.quantityOnHand ?? 0}`,
        );
      }
    }

    const transferCode = `TRF-${dto.salonId.slice(-4).toUpperCase()}-${Date.now().toString().slice(-6)}-${SecurityUtil.generateRandomToken(3).toUpperCase()}`;

    const transfer = await this.transactionService.run(async (tx) => {
      const created = await this.transferRepo.create(dto, transferCode);
      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'INVENTORY_MANAGER',
        action: 'CREATE_TRANSFER',
        entityType: 'StockTransfer',
        entityId: created.id,
        newState: created as any,
      });
      return created;
    });

    await this.eventBus.publish(
      new StockTransferCreatedEvent(
        {
          transferId: transfer.id,
          transferCode: transfer.transferCode,
          salonId: transfer.salonId,
          sourceBranchId: transfer.sourceBranchId,
          destinationBranchId: transfer.destinationBranchId,
        },
        actorUserId,
      ),
    );

    return new StockTransferEntity(transfer as any);
  }

  public async dispatchTransfer(id: string, salonId: string, actorUserId: string): Promise<StockTransferEntity> {
    const transfer = await this.transferRepo.findById(id);
    if (!transfer || transfer.salonId !== salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.TRANSFER_NOT_FOUND, 'Stock transfer not found');
    }

    if (transfer.status !== TransferStatus.DRAFT && transfer.status !== TransferStatus.PENDING_DISPATCH) {
      throw new BusinessException(ERROR_CODES.INVENTORY.INVALID_STATE, `Cannot dispatch transfer in status ${transfer.status}`);
    }

    const items = await this.itemRepo.findByTransfer(id);

    const dispatched = await this.transactionService.run(async (tx) => {
      for (const item of items) {
        const sourceStock = await this.stockRepo.findByVariant(transfer.sourceBranchId, item.productVariantId, item.batchNumber, tx);
        if (!sourceStock || sourceStock.quantityOnHand < item.dispatchedQuantity) {
          throw new BusinessException(ERROR_CODES.INVENTORY.INSUFFICIENT_STOCK, `Insufficient stock to dispatch at source branch for variant ${item.productVariantId}`);
        }

        await this.stockRepo.updateStock(sourceStock.id, -item.dispatchedQuantity, sourceStock.version, tx);

        const movementCode = `SM-${salonId.slice(-4).toUpperCase()}-${Date.now().toString().slice(-6)}-${SecurityUtil.generateRandomToken(3).toUpperCase()}`;
        await this.movementRepo.create(
          {
            movementCode,
            salonId,
            branchId: transfer.sourceBranchId,
            productVariantId: item.productVariantId,
            batchNumber: item.batchNumber,
            type: StockMovementType.TRANSFER_OUT,
            quantity: -item.dispatchedQuantity,
            previousQuantity: sourceStock.quantityOnHand,
            newQuantity: sourceStock.quantityOnHand - item.dispatchedQuantity,
            referenceType: 'StockTransfer',
            referenceId: transfer.id,
            actorUserId,
          },
          tx,
        );
      }

      const updated = await this.transferRepo.updateStatus(id, TransferStatus.DISPATCHED, actorUserId, tx);
      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'INVENTORY_MANAGER',
        action: 'DISPATCH_TRANSFER',
        entityType: 'StockTransfer',
        entityId: id,
        previousState: transfer as any,
        newState: updated as any,
      });
      return updated;
    });

    await this.cacheService.delete(`inventory:transfer:${id}`);
    await this.eventBus.publish(
      new StockTransferDispatchedEvent(
        {
          transferId: id,
          sourceBranchId: transfer.sourceBranchId,
          destinationBranchId: transfer.destinationBranchId,
          dispatchedByUserId: actorUserId,
        },
        actorUserId,
      ),
    );

    return new StockTransferEntity(dispatched as any);
  }

  public async receiveTransfer(id: string, salonId: string, actorUserId: string): Promise<StockTransferEntity> {
    const transfer = await this.transferRepo.findById(id);
    if (!transfer || transfer.salonId !== salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.TRANSFER_NOT_FOUND, 'Stock transfer not found');
    }

    if (transfer.status !== TransferStatus.DISPATCHED && transfer.status !== TransferStatus.PARTIALLY_RECEIVED) {
      throw new BusinessException(ERROR_CODES.INVENTORY.INVALID_STATE, `Cannot receive transfer in status ${transfer.status}`);
    }

    const items = await this.itemRepo.findByTransfer(id);

    const received = await this.transactionService.run(async (tx) => {
      for (const item of items) {
        const destStock = await this.stockRepo.findByVariant(transfer.destinationBranchId, item.productVariantId, item.batchNumber, tx);
        const prevQty = destStock?.quantityOnHand ?? 0;
        const newQty = prevQty + item.dispatchedQuantity;

        await this.stockRepo.upsertStock(
          {
            salonId,
            branchId: transfer.destinationBranchId,
            productVariantId: item.productVariantId,
            batchNumber: item.batchNumber,
            quantityOnHand: item.dispatchedQuantity,
          },
          tx,
        );

        const movementCode = `SM-${salonId.slice(-4).toUpperCase()}-${Date.now().toString().slice(-6)}-${SecurityUtil.generateRandomToken(3).toUpperCase()}`;
        await this.movementRepo.create(
          {
            movementCode,
            salonId,
            branchId: transfer.destinationBranchId,
            productVariantId: item.productVariantId,
            batchNumber: item.batchNumber,
            type: StockMovementType.TRANSFER_IN,
            quantity: item.dispatchedQuantity,
            previousQuantity: prevQty,
            newQuantity: newQty,
            referenceType: 'StockTransfer',
            referenceId: transfer.id,
            actorUserId,
          },
          tx,
        );
      }

      const updated = await this.transferRepo.updateStatus(id, TransferStatus.FULLY_RECEIVED, actorUserId, tx);
      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'INVENTORY_MANAGER',
        action: 'RECEIVE_TRANSFER',
        entityType: 'StockTransfer',
        entityId: id,
        previousState: transfer as any,
        newState: updated as any,
      });
      return updated;
    });

    await this.cacheService.delete(`inventory:transfer:${id}`);
    await this.eventBus.publish(
      new StockTransferReceivedEvent(
        {
          transferId: id,
          destinationBranchId: transfer.destinationBranchId,
          receivedByUserId: actorUserId,
        },
        actorUserId,
      ),
    );

    return new StockTransferEntity(received as any);
  }

  public async cancelTransfer(id: string, salonId: string, actorUserId: string): Promise<StockTransferEntity> {
    const transfer = await this.transferRepo.findById(id);
    if (!transfer || transfer.salonId !== salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.TRANSFER_NOT_FOUND, 'Stock transfer not found');
    }

    if (transfer.status !== TransferStatus.DRAFT && transfer.status !== TransferStatus.PENDING_DISPATCH) {
      throw new BusinessException(ERROR_CODES.INVENTORY.INVALID_STATE, 'Cannot cancel a transfer that has already been dispatched');
    }

    const cancelled = await this.transferRepo.updateStatus(id, TransferStatus.CANCELLED, actorUserId);
    await this.cacheService.delete(`inventory:transfer:${id}`);
    return new StockTransferEntity(cancelled as any);
  }

  public async getTransfer(id: string, salonId: string): Promise<StockTransferEntity> {
    const cached = await this.cacheService.get<StockTransferEntity>(`inventory:transfer:${id}`);
    if (cached) return new StockTransferEntity(cached);

    const transfer = await this.transferRepo.findById(id);
    if (!transfer || transfer.salonId !== salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.TRANSFER_NOT_FOUND, 'Stock transfer not found');
    }

    const entity = new StockTransferEntity(transfer as any);
    await this.cacheService.set(`inventory:transfer:${id}`, entity, 900);
    return entity;
  }

  public async searchTransfers(query: SearchTransferQueryDto): Promise<{ data: StockTransferEntity[]; total: number }> {
    const result = await this.transferRepo.search(query);
    return {
      data: result.data.map((t) => new StockTransferEntity(t as any)),
      total: result.total,
    };
  }
}
