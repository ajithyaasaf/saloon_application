import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CouponStatus } from '@prisma/client';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { CreateCouponData, SearchCouponQueryDto, UpdateCouponData } from '../dto/coupon.dto';
import { CouponEntity } from '../entities/coupon.entity';
import {
  CouponActivatedEvent,
  CouponArchivedEvent,
  CouponCreatedEvent,
  CouponPausedEvent,
  CouponUpdatedEvent,
} from '../events/promotions.events';
import { CouponUsageRepository } from '../repositories/coupon-usage.repository';
import { CouponRepository } from '../repositories/coupon.repository';
import {
  CouponValidationResult,
  CouponValidationService,
  ValidateCouponContext,
} from './coupon-validation.service';

@Injectable()
export class CouponService {
  private readonly logger = new Logger(CouponService.name);

  constructor(
    private readonly couponRepo: CouponRepository,
    private readonly couponUsageRepo: CouponUsageRepository,
    private readonly validationService: CouponValidationService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBus: EventBusService,
  ) {}

  public async createCoupon(data: CreateCouponData, actorId?: string): Promise<CouponEntity> {
    const code = data.code.toUpperCase().trim();

    const exists = await this.couponRepo.checkCodeExists(code, data.salonId ?? undefined);
    if (exists) {
      throw new ConflictException(`Coupon with code "${code}" already exists.`);
    }

    if (data.startDate >= data.endDate) {
      throw new BadRequestException('Coupon startDate must be strictly before endDate.');
    }

    const created = await this.couponRepo.create({
      ...data,
      code,
    });

    const entity = new CouponEntity(created);

    // Invalidate Cache
    await this.invalidateCouponCache(entity.salonId ?? undefined);

    // Audit Logging
    await this.auditService.log({
      action: 'COUPON_CREATED',
      entityType: 'Coupon',
      entityId: entity.id,
      actorId,
      newState: {
        code: entity.code,
        discountType: entity.discountType,
        discountValue: entity.discountValue,
        salonId: entity.salonId,
      },
    });

    // Domain Event
    await this.eventBus.publish(
      new CouponCreatedEvent(
        {
          couponId: entity.id,
          salonId: entity.salonId,
          code: entity.code,
          name: entity.name,
          discountType: entity.discountType,
          discountValue: entity.discountValue,
          startDate: entity.startDate,
          endDate: entity.endDate,
        },
        actorId,
      ),
    );

    return entity;
  }

  public async updateCoupon(
    id: string,
    data: UpdateCouponData,
    salonId?: string,
    expectedVersion?: number,
    actorId?: string,
  ): Promise<CouponEntity> {
    const existing = await this.couponRepo.findById(id, salonId);
    if (!existing) {
      throw new NotFoundException(`Coupon with id ${id} not found.`);
    }

    if (data.startDate && data.endDate && data.startDate >= data.endDate) {
      throw new BadRequestException('Coupon startDate must be strictly before endDate.');
    }

    const updated = await this.couponRepo.update(id, data, expectedVersion);
    const entity = new CouponEntity(updated);

    // Invalidate Cache
    await this.invalidateCouponCache(entity.salonId ?? undefined, entity.id);

    // Audit Logging
    await this.auditService.log({
      action: 'COUPON_UPDATED',
      entityType: 'Coupon',
      entityId: entity.id,
      actorId,
      previousState: { status: existing.status },
      newState: { status: entity.status },
      entityVersion: entity.version,
    });

    // Domain Event
    await this.eventBus.publish(
      new CouponUpdatedEvent(
        {
          couponId: entity.id,
          salonId: entity.salonId,
          updatedFields: Object.keys(data),
        },
        actorId,
      ),
    );

    return entity;
  }

  public async activateCoupon(
    id: string,
    salonId?: string,
    expectedVersion?: number,
    actorId?: string,
  ): Promise<CouponEntity> {
    const updated = await this.couponRepo.updateStatus(id, CouponStatus.ACTIVE, expectedVersion);
    const entity = new CouponEntity(updated);

    await this.invalidateCouponCache(entity.salonId ?? undefined, entity.id);

    await this.auditService.log({
      action: 'COUPON_ACTIVATED',
      entityType: 'Coupon',
      entityId: entity.id,
      actorId,
      newState: { status: CouponStatus.ACTIVE },
      entityVersion: entity.version,
    });

    await this.eventBus.publish(
      new CouponActivatedEvent(
        {
          couponId: entity.id,
          salonId: entity.salonId,
          code: entity.code,
        },
        actorId,
      ),
    );

    return entity;
  }

  public async pauseCoupon(
    id: string,
    salonId?: string,
    expectedVersion?: number,
    actorId?: string,
  ): Promise<CouponEntity> {
    const updated = await this.couponRepo.updateStatus(id, CouponStatus.PAUSED, expectedVersion);
    const entity = new CouponEntity(updated);

    await this.invalidateCouponCache(entity.salonId ?? undefined, entity.id);

    await this.auditService.log({
      action: 'COUPON_PAUSED',
      entityType: 'Coupon',
      entityId: entity.id,
      actorId,
      newState: { status: CouponStatus.PAUSED },
      entityVersion: entity.version,
    });

    await this.eventBus.publish(
      new CouponPausedEvent(
        {
          couponId: entity.id,
          salonId: entity.salonId,
          code: entity.code,
        },
        actorId,
      ),
    );

    return entity;
  }

  public async archiveCoupon(
    id: string,
    salonId?: string,
    actorId?: string,
  ): Promise<CouponEntity> {
    const archived = await this.couponRepo.softDelete(id, salonId);
    const entity = new CouponEntity(archived);

    await this.invalidateCouponCache(entity.salonId ?? undefined, entity.id);

    await this.auditService.log({
      action: 'COUPON_ARCHIVED',
      entityType: 'Coupon',
      entityId: entity.id,
      actorId,
      entityVersion: entity.version,
    });

    await this.eventBus.publish(
      new CouponArchivedEvent(
        {
          couponId: entity.id,
          salonId: entity.salonId,
          code: entity.code,
        },
        actorId,
      ),
    );

    return entity;
  }

  public async getCouponById(id: string, salonId?: string): Promise<CouponEntity> {
    const coupon = await this.couponRepo.findById(id, salonId);
    if (!coupon) {
      throw new NotFoundException(`Coupon with id ${id} not found.`);
    }
    return new CouponEntity(coupon);
  }

  public async getCouponByCode(code: string, salonId?: string): Promise<CouponEntity> {
    const coupon = await this.couponRepo.findByCode(code, salonId);
    if (!coupon) {
      throw new NotFoundException(`Coupon with code ${code} not found.`);
    }
    return new CouponEntity(coupon);
  }

  public async searchCoupons(
    query: SearchCouponQueryDto,
  ): Promise<{ data: CouponEntity[]; total: number }> {
    const res = await this.couponRepo.search(query);
    return {
      data: res.data.map((c) => new CouponEntity(c)),
      total: res.total,
    };
  }

  public async findActiveBySalon(salonId?: string, checkDate = new Date()): Promise<CouponEntity[]> {
    const coupons = await this.couponRepo.findActiveBySalon(salonId, checkDate);
    return coupons.map((c) => new CouponEntity(c));
  }

  public async findAutoApplyCoupons(
    salonId?: string,
    checkDate = new Date(),
  ): Promise<CouponEntity[]> {
    const coupons = await this.couponRepo.findAutoApplyCoupons(salonId, checkDate);
    return coupons.map((c) => new CouponEntity(c));
  }

  public async validateCouponForCheckout(
    code: string,
    context: Omit<ValidateCouponContext, 'coupon' | 'customerUsageCount'>,
  ): Promise<CouponValidationResult> {
    const couponDoc = await this.couponRepo.findActiveByCode(
      code,
      context.salonId,
      context.checkDate,
    );

    if (!couponDoc) {
      return {
        isValid: false,
        reason: 'Coupon code is invalid or has expired.',
        discountAmount: 0,
        qualifyingAmount: 0,
        eligibleItems: [],
      };
    }

    const coupon = new CouponEntity(couponDoc);

    const customerUsageCount = await this.couponUsageRepo.countCustomerUsage(
      context.customerId,
      coupon.id,
    );

    return this.validationService.validateAndCalculate({
      ...context,
      coupon,
      customerUsageCount,
    });
  }

  private async invalidateCouponCache(salonId?: string, couponId?: string): Promise<void> {
    const keys: string[] = ['coupons:auto-apply'];
    if (salonId) {
      keys.push(`salon:${salonId}:coupons:active`);
      keys.push(`salon:${salonId}:coupons:all`);
    }
    if (couponId) {
      keys.push(`coupon:${couponId}`);
    }

    for (const k of keys) {
      await this.cacheService.delete(k);
    }
  }
}
