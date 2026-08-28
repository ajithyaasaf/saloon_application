import { Injectable, Logger } from '@nestjs/common';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { LowStockAlertEntity } from '../entities/inventory-stock.entity';
import { LowStockAlertEvent } from '../events/inventory-events.event';
import { InventoryStockRepository, LowStockAlertRepository } from '../repositories/inventory-stock.repository';
import { ProductVariantRepository } from '../repositories/product.repository';

@Injectable()
export class LowStockAlertService {
  private readonly logger = new Logger(LowStockAlertService.name);

  constructor(
    private readonly alertRepo: LowStockAlertRepository,
    private readonly stockRepo: InventoryStockRepository,
    private readonly variantRepo: ProductVariantRepository,
    private readonly cacheService: CacheService,
    private readonly eventBus: EventBusService,
  ) {}

  public async evaluateStockLevel(
    branchId: string,
    productVariantId: string,
    actorUserId?: string,
  ): Promise<LowStockAlertEntity | null> {
    const variant = await this.variantRepo.findById(productVariantId);
    if (!variant) return null;

    const stocks = await this.stockRepo.findByBranch(branchId);
    const variantStocks = stocks.filter((s) => s.productVariantId === productVariantId);
    const totalQuantityOnHand = variantStocks.reduce((sum, s) => sum + s.quantityOnHand, 0);

    if (totalQuantityOnHand <= variant.reorderPoint) {
      const activeAlerts = await this.alertRepo.findActive(branchId);
      const existingAlert = activeAlerts.find((a) => a.productVariantId === productVariantId);

      if (!existingAlert) {
        const salonId = (variantStocks[0]?.salonId) ?? '';

        const created = await this.alertRepo.create({
          salonId,
          branchId,
          productVariantId,
          currentQuantity: totalQuantityOnHand,
          reorderPoint: variant.reorderPoint,
        });

        await this.cacheService.delete(`inventory:alerts:${branchId}`);
        await this.eventBus.publish(
          new LowStockAlertEvent(
            {
              alertId: created.id,
              salonId,
              branchId,
              productVariantId,
              currentQuantity: totalQuantityOnHand,
              reorderPoint: variant.reorderPoint,
            },
            actorUserId,
          ),
        );

        return new LowStockAlertEntity(created as any);
      }
    }

    return null;
  }

  public async createAlert(
    salonId: string,
    branchId: string,
    productVariantId: string,
    currentQuantity: number,
    reorderPoint: number,
    actorUserId?: string,
  ): Promise<LowStockAlertEntity> {
    const activeAlerts = await this.alertRepo.findActive(branchId);
    const existing = activeAlerts.find((a) => a.productVariantId === productVariantId);
    if (existing) {
      return new LowStockAlertEntity(existing as any);
    }

    const created = await this.alertRepo.create({
      salonId,
      branchId,
      productVariantId,
      currentQuantity,
      reorderPoint,
    });

    await this.cacheService.delete(`inventory:alerts:${branchId}`);
    await this.eventBus.publish(
      new LowStockAlertEvent(
        {
          alertId: created.id,
          salonId,
          branchId,
          productVariantId,
          currentQuantity,
          reorderPoint,
        },
        actorUserId,
      ),
    );

    return new LowStockAlertEntity(created as any);
  }

  public async acknowledgeAlert(id: string, salonId: string, actorUserId: string): Promise<LowStockAlertEntity> {
    const alert = await this.alertRepo.findById(id);
    if (!alert || (alert.salonId && alert.salonId !== salonId)) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.ALERT_NOT_FOUND, 'Low stock alert not found');
    }

    const updated = await this.alertRepo.acknowledge(id, actorUserId);
    await this.cacheService.delete(`inventory:alerts:${alert.branchId}`);
    return new LowStockAlertEntity(updated as any);
  }

  public async resolveAlert(id: string, salonId: string, actorUserId: string): Promise<LowStockAlertEntity> {
    const alert = await this.alertRepo.findById(id);
    if (!alert || (alert.salonId && alert.salonId !== salonId)) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.ALERT_NOT_FOUND, 'Low stock alert not found');
    }

    const updated = await this.alertRepo.resolve(id);
    await this.cacheService.delete(`inventory:alerts:${alert.branchId}`);
    return new LowStockAlertEntity(updated as any);
  }

  public async getActiveAlerts(branchId: string): Promise<LowStockAlertEntity[]> {
    const alerts = await this.alertRepo.findActive(branchId);
    return alerts.map((a) => new LowStockAlertEntity(a as any));
  }
}
