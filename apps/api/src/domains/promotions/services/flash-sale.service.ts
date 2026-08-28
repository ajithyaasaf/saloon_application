import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { FlashSaleStatus } from '@prisma/client';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { CreateFlashSaleData, SearchFlashSaleQueryDto, UpdateFlashSaleData } from '../dto/flash-sale.dto';
import { FlashSaleEntity } from '../entities/flash-sale.entity';
import {
  FlashSaleActivatedEvent,
  FlashSaleCancelledEvent,
  FlashSaleCreatedEvent,
  FlashSaleEndedEvent,
} from '../events/promotions.events';
import { FlashSaleRepository } from '../repositories/flash-sale.repository';

@Injectable()
export class FlashSaleService {
  private readonly logger = new Logger(FlashSaleService.name);

  constructor(
    private readonly flashSaleRepo: FlashSaleRepository,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBus: EventBusService,
  ) {}

  public async createFlashSale(
    data: CreateFlashSaleData,
    actorId?: string,
  ): Promise<FlashSaleEntity> {
    if (data.startTime >= data.endTime) {
      throw new BadRequestException('Flash sale startTime must be before endTime.');
    }

    if (data.maxSlotQuota <= 0) {
      throw new BadRequestException('Flash sale maxSlotQuota must be greater than 0.');
    }

    if (data.specialPrice < 0) {
      throw new BadRequestException('Flash sale specialPrice cannot be negative.');
    }

    const created = await this.flashSaleRepo.create(data);
    const entity = new FlashSaleEntity(created);

    await this.invalidateFlashSaleCache(entity.salonId, entity.branchId);

    await this.auditService.log({
      action: 'FLASH_SALE_CREATED',
      entityType: 'FlashSale',
      entityId: entity.id,
      actorId,
      metadata: {
        salonId: entity.salonId,
        branchId: entity.branchId,
      },
      newState: {
        title: entity.title,
        specialPrice: entity.specialPrice,
        maxSlotQuota: entity.maxSlotQuota,
      },
    });

    await this.eventBus.publish(
      new FlashSaleCreatedEvent(
        {
          flashSaleId: entity.id,
          salonId: entity.salonId,
          branchId: entity.branchId,
          serviceId: entity.serviceId,
          discountPercentage: entity.discountPercentage,
          specialPrice: entity.specialPrice,
          startTime: entity.startTime,
          endTime: entity.endTime,
          maxSlotQuota: entity.maxSlotQuota,
        },
        actorId,
      ),
    );

    return entity;
  }

  public async updateFlashSale(
    id: string,
    data: UpdateFlashSaleData,
    salonId?: string,
    expectedVersion?: number,
    actorId?: string,
  ): Promise<FlashSaleEntity> {
    const existing = await this.flashSaleRepo.findById(id, salonId);
    if (!existing) {
      throw new NotFoundException(`Flash sale with id ${id} not found.`);
    }

    if (data.startTime && data.endTime && data.startTime >= data.endTime) {
      throw new BadRequestException('Flash sale startTime must be before endTime.');
    }

    const updated = await this.flashSaleRepo.update(id, data, expectedVersion);
    const entity = new FlashSaleEntity(updated);

    await this.invalidateFlashSaleCache(entity.salonId, entity.branchId);

    await this.auditService.log({
      action: 'FLASH_SALE_UPDATED',
      entityType: 'FlashSale',
      entityId: entity.id,
      actorId,
      metadata: {
        salonId: entity.salonId,
        branchId: entity.branchId,
      },
      newState: { ...data },
      entityVersion: entity.version,
    });

    return entity;
  }

  public async activateFlashSale(
    id: string,
    salonId?: string,
    expectedVersion?: number,
    actorId?: string,
  ): Promise<FlashSaleEntity> {
    const updated = await this.flashSaleRepo.updateStatus(
      id,
      FlashSaleStatus.ACTIVE,
      expectedVersion,
    );
    const entity = new FlashSaleEntity(updated);

    await this.invalidateFlashSaleCache(entity.salonId, entity.branchId);

    await this.auditService.log({
      action: 'FLASH_SALE_ACTIVATED',
      entityType: 'FlashSale',
      entityId: entity.id,
      actorId,
      metadata: {
        salonId: entity.salonId,
        branchId: entity.branchId,
      },
      newState: { status: FlashSaleStatus.ACTIVE },
      entityVersion: entity.version,
    });

    await this.eventBus.publish(
      new FlashSaleActivatedEvent(
        {
          flashSaleId: entity.id,
          salonId: entity.salonId,
          branchId: entity.branchId,
          serviceId: entity.serviceId,
        },
        actorId,
      ),
    );

    return entity;
  }

  public async endFlashSale(
    id: string,
    salonId?: string,
    expectedVersion?: number,
    actorId?: string,
  ): Promise<FlashSaleEntity> {
    const updated = await this.flashSaleRepo.end(id, expectedVersion);
    const entity = new FlashSaleEntity(updated);

    await this.invalidateFlashSaleCache(entity.salonId, entity.branchId);

    await this.auditService.log({
      action: 'FLASH_SALE_ENDED',
      entityType: 'FlashSale',
      entityId: entity.id,
      actorId,
      metadata: {
        salonId: entity.salonId,
        branchId: entity.branchId,
      },
      newState: { status: FlashSaleStatus.ENDED },
      entityVersion: entity.version,
    });

    await this.eventBus.publish(
      new FlashSaleEndedEvent(
        {
          flashSaleId: entity.id,
          salonId: entity.salonId,
          bookedSlotCount: entity.bookedSlotCount,
        },
        actorId,
      ),
    );

    return entity;
  }

  public async cancelFlashSale(
    id: string,
    salonId?: string,
    reason?: string,
    expectedVersion?: number,
    actorId?: string,
  ): Promise<FlashSaleEntity> {
    const updated = await this.flashSaleRepo.cancel(id, expectedVersion);
    const entity = new FlashSaleEntity(updated);

    await this.invalidateFlashSaleCache(entity.salonId, entity.branchId);

    await this.auditService.log({
      action: 'FLASH_SALE_CANCELLED',
      entityType: 'FlashSale',
      entityId: entity.id,
      actorId,
      metadata: {
        salonId: entity.salonId,
        branchId: entity.branchId,
      },
      newState: { status: FlashSaleStatus.CANCELLED, reason },
      entityVersion: entity.version,
    });

    await this.eventBus.publish(
      new FlashSaleCancelledEvent(
        {
          flashSaleId: entity.id,
          salonId: entity.salonId,
          reason,
        },
        actorId,
      ),
    );

    return entity;
  }

  public async reserveSlot(id: string, branchId?: string): Promise<FlashSaleEntity> {
    const flashSale = await this.flashSaleRepo.findById(id);
    if (!flashSale) {
      throw new NotFoundException(`Flash sale with id ${id} not found.`);
    }

    const entity = new FlashSaleEntity(flashSale);
    if (!entity.isAvailable()) {
      throw new ConflictException(
        `Flash sale slot cannot be reserved. Available: ${entity.isAvailable()}`,
      );
    }

    const updated = await this.flashSaleRepo.incrementBookedSlot(id, flashSale.version);
    const resultEntity = new FlashSaleEntity(updated);

    await this.invalidateFlashSaleCache(resultEntity.salonId, resultEntity.branchId);
    return resultEntity;
  }

  public async releaseSlot(id: string): Promise<FlashSaleEntity> {
    const updated = await this.flashSaleRepo.decrementBookedSlot(id);
    const entity = new FlashSaleEntity(updated);

    await this.invalidateFlashSaleCache(entity.salonId, entity.branchId);
    return entity;
  }

  public async getCurrentlyActiveFlashSales(
    branchId?: string,
    checkTime = new Date(),
  ): Promise<FlashSaleEntity[]> {
    const sales = await this.flashSaleRepo.findCurrentlyActive(branchId, checkTime);
    return sales.map((s) => new FlashSaleEntity(s));
  }

  public async getFlashSaleById(id: string, salonId?: string): Promise<FlashSaleEntity> {
    const sale = await this.flashSaleRepo.findById(id, salonId);
    if (!sale) {
      throw new NotFoundException(`Flash sale with id ${id} not found.`);
    }
    return new FlashSaleEntity(sale);
  }

  public async searchFlashSales(
    query: SearchFlashSaleQueryDto,
  ): Promise<{ data: FlashSaleEntity[]; total: number }> {
    const res = await this.flashSaleRepo.search(query);
    return {
      data: res.data.map((s) => new FlashSaleEntity(s)),
      total: res.total,
    };
  }

  private async invalidateFlashSaleCache(salonId: string, branchId: string): Promise<void> {
    await Promise.all([
      this.cacheService.delete(`salon:${salonId}:flashsales:active`),
      this.cacheService.delete(`branch:${branchId}:flashsales:active`),
    ]);
  }
}
