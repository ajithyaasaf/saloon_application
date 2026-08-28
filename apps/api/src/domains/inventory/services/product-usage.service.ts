import { Injectable, Logger } from '@nestjs/common';
import { ProductUsageType, StockMovementType } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { SecurityUtil } from '../../../common/utils/security.util';
import { AuditService } from '../../../shared/audit/audit.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { CreateProductUsageDto } from '../dto/product-usage.dto';
import { ProductUsageEntity } from '../entities/product-usage.entity';
import { ProductUsageRecordedEvent } from '../events/inventory-events.event';
import { InventoryStockRepository } from '../repositories/inventory-stock.repository';
import { ProductUsageRepository } from '../repositories/product-usage.repository';
import { StockMovementRepository } from '../repositories/stock-movement.repository';

@Injectable()
export class ProductUsageService {
  private readonly logger = new Logger(ProductUsageService.name);

  constructor(
    private readonly usageRepo: ProductUsageRepository,
    private readonly stockRepo: InventoryStockRepository,
    private readonly movementRepo: StockMovementRepository,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly eventBus: EventBusService,
  ) {}

  public async recordUsage(dto: CreateProductUsageDto, actorUserId: string): Promise<ProductUsageEntity> {
    if (dto.quantity <= 0) {
      throw new ValidationException('Usage quantity must be positive');
    }

    const batchNumber = dto.batchNumber ?? 'DEFAULT_BATCH';
    const stock = await this.stockRepo.findByVariant(dto.branchId, dto.productVariantId, batchNumber);
    if (!stock) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.STOCK_NOT_FOUND, 'Inventory stock not found for branch and variant');
    }

    const available = stock.quantityOnHand - stock.quantityReserved;
    if (available < dto.quantity) {
      throw new BusinessException(ERROR_CODES.INVENTORY.INSUFFICIENT_STOCK, `Insufficient stock for usage. Available: ${available}, requested: ${dto.quantity}`);
    }

    const usageCode = `USG-${dto.salonId.slice(-4).toUpperCase()}-${Date.now().toString().slice(-6)}-${SecurityUtil.generateRandomToken(3).toUpperCase()}`;

    let movementType: StockMovementType;
    switch (dto.usageType) {
      case ProductUsageType.SERVICE_CONSUMPTION:
        movementType = StockMovementType.SERVICE_CONSUMPTION;
        break;
      case ProductUsageType.RETAIL_SALE:
        movementType = StockMovementType.SALE;
        break;
      case ProductUsageType.DAMAGE:
        movementType = StockMovementType.DAMAGE_WRITE_OFF;
        break;
      case ProductUsageType.WASTE:
        movementType = StockMovementType.DAMAGE_WRITE_OFF;
        break;
      case ProductUsageType.TESTER_SAMPLE:
      case ProductUsageType.MANUAL_INTERNAL:
      default:
        movementType = StockMovementType.INTERNAL_USE;
        break;
    }

    const usage = await this.transactionService.run(async (tx) => {
      const created = await this.usageRepo.create(dto, usageCode);
      await this.stockRepo.updateStock(stock.id, -dto.quantity, stock.version);

      const movementCode = `SM-${dto.salonId.slice(-4).toUpperCase()}-${Date.now().toString().slice(-6)}-${SecurityUtil.generateRandomToken(3).toUpperCase()}`;
      await this.movementRepo.create({
        movementCode,
        salonId: dto.salonId,
        branchId: dto.branchId,
        productVariantId: dto.productVariantId,
        batchNumber,
        type: movementType,
        quantity: -dto.quantity,
        previousQuantity: stock.quantityOnHand,
        newQuantity: stock.quantityOnHand - dto.quantity,
        referenceType: dto.referenceType ?? 'ProductUsage',
        referenceId: dto.referenceId ?? created.id,
        actorUserId,
      });

      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'STAFF',
        action: 'RECORD_USAGE',
        entityType: 'ProductUsage',
        entityId: created.id,
        newState: created as any,
      });

      return created;
    });

    await this.eventBus.publish(
      new ProductUsageRecordedEvent(
        {
          usageId: usage.id,
          salonId: usage.salonId,
          branchId: usage.branchId,
          productVariantId: usage.productVariantId,
          quantity: usage.quantity,
          usageType: usage.usageType,
        },
        actorUserId,
      ),
    );

    return new ProductUsageEntity(usage as any);
  }

  public async getUsage(id: string, salonId: string): Promise<ProductUsageEntity> {
    const usage = await this.usageRepo.findById(id);
    if (!usage || usage.salonId !== salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.USAGE_NOT_FOUND, 'Product usage record not found');
    }
    return new ProductUsageEntity(usage as any);
  }

  public async getUsageByProduct(productVariantId: string): Promise<ProductUsageEntity[]> {
    const list = await this.usageRepo.findByProduct(productVariantId);
    return list.map((u) => new ProductUsageEntity(u as any));
  }

  public async getUsageByBranch(branchId: string): Promise<ProductUsageEntity[]> {
    const list = await this.usageRepo.findByBranch(branchId);
    return list.map((u) => new ProductUsageEntity(u as any));
  }

  public async getUsageByReference(referenceType: string, referenceId: string): Promise<ProductUsageEntity[]> {
    const list = await this.usageRepo.findByReference(referenceType, referenceId);
    return list.map((u) => new ProductUsageEntity(u as any));
  }
}
