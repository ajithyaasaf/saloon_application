import { Injectable, Logger } from '@nestjs/common';
import { StockMovementType } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { SecurityUtil } from '../../../common/utils/security.util';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { SearchInventoryQueryDto } from '../dto/search-inventory.dto';
import { InventoryStockEntity } from '../entities/inventory-stock.entity';
import {
  StockDecreasedEvent,
  StockIncreasedEvent,
  StockReleasedEvent,
  StockReservedEvent,
} from '../events/inventory-events.event';
import { InventoryStockRepository } from '../repositories/inventory-stock.repository';
import { StockMovementRepository } from '../repositories/stock-movement.repository';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly stockRepo: InventoryStockRepository,
    private readonly movementRepo: StockMovementRepository,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBus: EventBusService,
  ) {}

  public async getStock(id: string): Promise<InventoryStockEntity> {
    const stock = await this.stockRepo.findById(id);
    if (!stock) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.STOCK_NOT_FOUND, 'Inventory stock record not found');
    }
    return new InventoryStockEntity(stock as any);
  }

  public async searchInventory(query: SearchInventoryQueryDto): Promise<{ data: InventoryStockEntity[]; total: number }> {
    const result = await this.stockRepo.search(query);
    return {
      data: result.data.map((s) => new InventoryStockEntity(s as any)),
      total: result.total,
    };
  }

  public async getStockByVariant(
    branchId: string,
    productVariantId: string,
    batchNumber: string = 'DEFAULT_BATCH',
  ): Promise<InventoryStockEntity | null> {
    const stock = await this.stockRepo.findByVariant(branchId, productVariantId, batchNumber);
    return stock ? new InventoryStockEntity(stock as any) : null;
  }

  public async getLowStock(branchId: string): Promise<InventoryStockEntity[]> {
    const stocks = await this.stockRepo.findLowStock(branchId);
    return stocks.map((s) => new InventoryStockEntity(s as any));
  }

  public async getExpiringStock(branchId: string, thresholdDate: Date): Promise<InventoryStockEntity[]> {
    const stocks = await this.stockRepo.findExpiring(branchId, thresholdDate);
    return stocks.map((s) => new InventoryStockEntity(s as any));
  }

  public async checkAvailability(
    branchId: string,
    productVariantId: string,
    requestedQuantity: number,
    batchNumber: string = 'DEFAULT_BATCH',
  ): Promise<boolean> {
    const stock = await this.stockRepo.findByVariant(branchId, productVariantId, batchNumber);
    if (!stock) return false;
    const available = stock.quantityOnHand - stock.quantityReserved;
    return available >= requestedQuantity;
  }

  public async increaseStock(
    salonId: string,
    branchId: string,
    productVariantId: string,
    batchNumber: string = 'DEFAULT_BATCH',
    quantity: number,
    unitCostPrice: number,
    reason: StockMovementType,
    actorUserId: string,
    referenceType?: string,
    referenceId?: string,
  ): Promise<InventoryStockEntity> {
    if (quantity <= 0) {
      throw new ValidationException('Quantity increase must be positive');
    }

    const { stock, movement } = await this.transactionService.run(async (tx) => {
      const current = await this.stockRepo.findByVariant(branchId, productVariantId, batchNumber, tx);
      const prevQty = current?.quantityOnHand ?? 0;
      const newQty = prevQty + quantity;

      const updatedStock = await this.stockRepo.upsertStock(
        {
          salonId,
          branchId,
          productVariantId,
          batchNumber,
          quantityOnHand: quantity,
        },
        tx,
      );

      const movementCode = `SM-${salonId.slice(-4).toUpperCase()}-${Date.now().toString().slice(-6)}-${SecurityUtil.generateRandomToken(3).toUpperCase()}`;
      const createdMovement = await this.movementRepo.create(
        {
          movementCode,
          salonId,
          branchId,
          productVariantId,
          batchNumber,
          type: reason,
          quantity,
          unitCostPrice,
          totalValue: quantity * unitCostPrice,
          previousQuantity: prevQty,
          newQuantity: newQty,
          referenceType,
          referenceId,
          actorUserId,
        },
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'INVENTORY_MANAGER',
        action: 'INCREASE_STOCK',
        entityType: 'InventoryStock',
        entityId: updatedStock.id,
        previousState: current as any,
        newState: updatedStock as any,
      });

      return { stock: updatedStock, movement: createdMovement };
    });

    await this.cacheService.delete(`inventory:stock:${branchId}:${productVariantId}`);
    await this.eventBus.publish(
      new StockIncreasedEvent(
        {
          inventoryStockId: stock.id,
          salonId,
          branchId,
          productVariantId,
          quantityDelta: quantity,
          newQuantityOnHand: stock.quantityOnHand,
          reason,
        },
        actorUserId,
      ),
    );

    return new InventoryStockEntity(stock as any);
  }

  public async decreaseStock(
    salonId: string,
    branchId: string,
    productVariantId: string,
    batchNumber: string = 'DEFAULT_BATCH',
    quantity: number,
    reason: StockMovementType,
    actorUserId: string,
    referenceType?: string,
    referenceId?: string,
  ): Promise<InventoryStockEntity> {
    if (quantity <= 0) {
      throw new ValidationException('Quantity decrease must be positive');
    }

    const { stock, movement } = await this.transactionService.run(async (tx) => {
      const current = await this.stockRepo.findByVariant(branchId, productVariantId, batchNumber, tx);
      if (!current) {
        throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.STOCK_NOT_FOUND, 'Inventory stock record not found');
      }

      const available = current.quantityOnHand - current.quantityReserved;
      if (available < quantity) {
        throw new BusinessException(ERROR_CODES.INVENTORY.INSUFFICIENT_STOCK, `Insufficient stock available. Current available: ${available}, requested: ${quantity}`);
      }

      let updatedStock: any;
      try {
        updatedStock = await this.stockRepo.updateStock(current.id, -quantity, current.version, tx);
      } catch (err) {
        throw new ConflictException(ERROR_CODES.DATABASE.UNIQUE_VIOLATION, 'Concurrent stock update conflict. Please retry.');
      }

      const movementCode = `SM-${salonId.slice(-4).toUpperCase()}-${Date.now().toString().slice(-6)}-${SecurityUtil.generateRandomToken(3).toUpperCase()}`;
      const createdMovement = await this.movementRepo.create(
        {
          movementCode,
          salonId,
          branchId,
          productVariantId,
          batchNumber,
          type: reason,
          quantity: -quantity,
          previousQuantity: current.quantityOnHand,
          newQuantity: current.quantityOnHand - quantity,
          referenceType,
          referenceId,
          actorUserId,
        },
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'INVENTORY_MANAGER',
        action: 'DECREASE_STOCK',
        entityType: 'InventoryStock',
        entityId: updatedStock.id,
        previousState: current as any,
        newState: updatedStock as any,
      });

      return { stock: updatedStock, movement: createdMovement };
    });

    await this.cacheService.delete(`inventory:stock:${branchId}:${productVariantId}`);
    await this.eventBus.publish(
      new StockDecreasedEvent(
        {
          inventoryStockId: stock.id,
          salonId,
          branchId,
          productVariantId,
          quantityDelta: -quantity,
          newQuantityOnHand: stock.quantityOnHand,
          reason,
        },
        actorUserId,
      ),
    );

    return new InventoryStockEntity(stock as any);
  }

  public async reserveStock(
    branchId: string,
    productVariantId: string,
    batchNumber: string = 'DEFAULT_BATCH',
    quantity: number,
    actorUserId: string,
  ): Promise<InventoryStockEntity> {
    if (quantity <= 0) {
      throw new ValidationException('Reservation quantity must be positive');
    }

    const updatedStock = await this.transactionService.run(async (tx) => {
      const current = await this.stockRepo.findByVariant(branchId, productVariantId, batchNumber, tx);
      if (!current) {
        throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.STOCK_NOT_FOUND, 'Inventory stock record not found');
      }

      const available = current.quantityOnHand - current.quantityReserved;
      if (available < quantity) {
        throw new BusinessException(ERROR_CODES.INVENTORY.INSUFFICIENT_STOCK, `Cannot reserve ${quantity} items. Only ${available} items available`);
      }

      try {
        return await this.stockRepo.reserve(current.id, quantity, current.version, tx);
      } catch (err) {
        throw new ConflictException(ERROR_CODES.DATABASE.UNIQUE_VIOLATION, 'Concurrent reservation conflict. Please retry.');
      }
    });

    await this.cacheService.delete(`inventory:stock:${branchId}:${productVariantId}`);
    await this.eventBus.publish(
      new StockReservedEvent(
        {
          inventoryStockId: updatedStock.id,
          branchId,
          productVariantId,
          quantity,
        },
        actorUserId,
      ),
    );

    return new InventoryStockEntity(updatedStock as any);
  }

  public async releaseReservation(
    branchId: string,
    productVariantId: string,
    batchNumber: string = 'DEFAULT_BATCH',
    quantity: number,
    actorUserId: string,
  ): Promise<InventoryStockEntity> {
    if (quantity <= 0) {
      throw new ValidationException('Release quantity must be positive');
    }

    const updatedStock = await this.transactionService.run(async (tx) => {
      const current = await this.stockRepo.findByVariant(branchId, productVariantId, batchNumber, tx);
      if (!current) {
        throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.STOCK_NOT_FOUND, 'Inventory stock record not found');
      }

      if (current.quantityReserved < quantity) {
        throw new BusinessException(ERROR_CODES.INVENTORY.INVALID_STATE, `Cannot release ${quantity} items. Only ${current.quantityReserved} reserved`);
      }

      try {
        return await this.stockRepo.releaseReservation(current.id, quantity, current.version, tx);
      } catch (err) {
        throw new ConflictException(ERROR_CODES.DATABASE.UNIQUE_VIOLATION, 'Concurrent release conflict. Please retry.');
      }
    });

    await this.cacheService.delete(`inventory:stock:${branchId}:${productVariantId}`);
    await this.eventBus.publish(
      new StockReleasedEvent(
        {
          inventoryStockId: updatedStock.id,
          branchId,
          productVariantId,
          quantity,
        },
        actorUserId,
      ),
    );

    return new InventoryStockEntity(updatedStock as any);
  }
}
