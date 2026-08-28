import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CouponStatus, CouponUsageStatus } from '@prisma/client';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import {
  CouponUsageAggregationResult,
  CreateCouponUsageData,
  SearchCouponUsageQueryDto,
} from '../dto/coupon-usage.dto';
import { CouponUsageEntity } from '../entities/coupon-usage.entity';
import {
  CouponAppliedEvent,
  CouponDepletedEvent,
  CouponReversedEvent,
  CouponSettledEvent,
} from '../events/promotions.events';
import { CouponUsageRepository } from '../repositories/coupon-usage.repository';
import { CouponRepository } from '../repositories/coupon.repository';

export interface ApplyCouponInput {
  couponId: string;
  salonId: string;
  branchId: string;
  customerId: string;
  bookingId?: string | null;
  appointmentId?: string | null;
  invoiceId?: string | null;
  discountAmount: number;
  bookingTotalBeforeDiscount: number;
  bookingTotalAfterDiscount: number;
}

@Injectable()
export class CouponUsageService {
  private readonly logger = new Logger(CouponUsageService.name);

  constructor(
    private readonly couponUsageRepo: CouponUsageRepository,
    private readonly couponRepo: CouponRepository,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBus: EventBusService,
  ) {}

  public async applyCoupon(input: ApplyCouponInput, actorId?: string): Promise<CouponUsageEntity> {
    const coupon = await this.couponRepo.findById(input.couponId, input.salonId);
    if (!coupon || coupon.deletedAt || coupon.status !== CouponStatus.ACTIVE) {
      throw new BadRequestException('Coupon is not active or valid for this salon.');
    }

    if (coupon.totalUsageLimit && coupon.currentUsageCount >= coupon.totalUsageLimit) {
      throw new ConflictException('Coupon total usage limit has been reached.');
    }

    const customerUsageCount = await this.couponUsageRepo.countCustomerUsage(
      input.customerId,
      coupon.id,
    );
    if (customerUsageCount >= coupon.perCustomerLimit) {
      throw new ConflictException(
        `Customer limit reached. You can only use this coupon ${coupon.perCustomerLimit} time(s).`,
      );
    }

    // Check duplicate booking application if bookingId provided
    if (input.bookingId) {
      const existingBookingUsage = await this.couponUsageRepo.findByBooking(input.bookingId);
      if (existingBookingUsage && existingBookingUsage.status !== CouponUsageStatus.REVERSED) {
        throw new ConflictException('A coupon has already been applied to this booking.');
      }
    }

    // Execute atomic transaction: Increment coupon usage + create CouponUsage record
    const { usage, depleted } = await this.transactionService.run(async (tx: PrismaTransaction) => {
      const updatedCoupon = await this.couponRepo.incrementUsage(coupon.id, 1, coupon.version, tx);

      const usageRecord = await this.couponUsageRepo.create(
        {
          couponId: input.couponId,
          salonId: input.salonId,
          branchId: input.branchId,
          customerId: input.customerId,
          bookingId: input.bookingId ?? null,
          appointmentId: input.appointmentId ?? null,
          invoiceId: input.invoiceId ?? null,
          discountAmount: input.discountAmount,
          bookingTotalBeforeDiscount: input.bookingTotalBeforeDiscount,
          bookingTotalAfterDiscount: input.bookingTotalAfterDiscount,
          status: CouponUsageStatus.APPLIED,
        },
        tx,
      );

      const isNowDepleted =
        updatedCoupon.totalUsageLimit !== null &&
        updatedCoupon.currentUsageCount >= updatedCoupon.totalUsageLimit;

      return { usage: usageRecord, depleted: isNowDepleted };
    });

    const entity = new CouponUsageEntity(usage);

    // Audit Logging
    await this.auditService.log({
      action: 'COUPON_APPLIED',
      entityType: 'CouponUsage',
      entityId: entity.id,
      actorId: actorId ?? entity.customerId,
      metadata: {
        salonId: entity.salonId,
        branchId: entity.branchId,
      },
      newState: {
        couponId: entity.couponId,
        discountAmount: entity.discountAmount,
        status: entity.status,
      },
    });

    // Domain Event: Coupon Applied
    await this.eventBus.publish(
      new CouponAppliedEvent(
        {
          usageId: entity.id,
          couponId: entity.couponId,
          salonId: entity.salonId,
          branchId: entity.branchId,
          customerId: entity.customerId,
          bookingId: entity.bookingId,
          discountAmount: entity.discountAmount,
        },
        actorId,
      ),
    );

    // If quota depleted, emit Depleted Event
    if (depleted) {
      await this.eventBus.publish(
        new CouponDepletedEvent(
          {
            couponId: coupon.id,
            salonId: coupon.salonId,
            code: coupon.code,
            totalUsageLimit: coupon.totalUsageLimit!,
          },
          actorId,
        ),
      );
    }

    return entity;
  }

  public async settleCouponUsage(
    usageId: string,
    invoiceId?: string,
    actorId?: string,
  ): Promise<CouponUsageEntity> {
    const existing = await this.couponUsageRepo.findById(usageId);
    if (!existing) {
      throw new NotFoundException(`Coupon usage with id ${usageId} not found.`);
    }

    if (existing.status !== CouponUsageStatus.APPLIED) {
      throw new ConflictException(
        `Cannot settle coupon usage with status "${existing.status}". Must be APPLIED.`,
      );
    }

    if (invoiceId) {
      await this.couponUsageRepo.update(usageId, { invoiceId });
    }

    const settled = await this.couponUsageRepo.settle(usageId);
    const entity = new CouponUsageEntity(settled);

    await this.auditService.log({
      action: 'COUPON_SETTLED',
      entityType: 'CouponUsage',
      entityId: entity.id,
      actorId,
      metadata: {
        salonId: entity.salonId,
        branchId: entity.branchId,
      },
      newState: { status: CouponUsageStatus.SETTLED, invoiceId },
    });

    await this.eventBus.publish(
      new CouponSettledEvent(
        {
          usageId: entity.id,
          couponId: entity.couponId,
          salonId: entity.salonId,
          customerId: entity.customerId,
          bookingId: entity.bookingId,
          invoiceId: invoiceId ?? entity.invoiceId,
          discountAmount: entity.discountAmount,
        },
        actorId,
      ),
    );

    return entity;
  }

  public async reverseCouponUsage(
    usageId: string,
    reversalReason: string,
    actorId?: string,
  ): Promise<CouponUsageEntity> {
    const existing = await this.couponUsageRepo.findById(usageId);
    if (!existing) {
      throw new NotFoundException(`Coupon usage with id ${usageId} not found.`);
    }

    if (
      existing.status !== CouponUsageStatus.APPLIED &&
      existing.status !== CouponUsageStatus.SETTLED
    ) {
      throw new ConflictException(
        `Cannot reverse coupon usage with status "${existing.status}".`,
      );
    }

    // Transactionally reverse usage and decrement coupon usage count to restore quota
    const reversed = await this.transactionService.run(async (tx: PrismaTransaction) => {
      await this.couponRepo.decrementUsage(existing.couponId, 1, undefined, tx);
      return this.couponUsageRepo.reverse(usageId, reversalReason, undefined, tx);
    });

    const entity = new CouponUsageEntity(reversed);

    await this.auditService.log({
      action: 'COUPON_REVERSED',
      entityType: 'CouponUsage',
      entityId: entity.id,
      actorId,
      metadata: {
        salonId: entity.salonId,
        branchId: entity.branchId,
      },
      newState: {
        status: CouponUsageStatus.REVERSED,
        reversalReason,
      },
    });

    await this.eventBus.publish(
      new CouponReversedEvent(
        {
          usageId: entity.id,
          couponId: entity.couponId,
          salonId: entity.salonId,
          customerId: entity.customerId,
          reversalReason,
          discountAmount: entity.discountAmount,
        },
        actorId,
      ),
    );

    return entity;
  }

  public async expireCouponUsage(usageId: string, actorId?: string): Promise<CouponUsageEntity> {
    const existing = await this.couponUsageRepo.findById(usageId);
    if (!existing) {
      throw new NotFoundException(`Coupon usage with id ${usageId} not found.`);
    }

    if (existing.status !== CouponUsageStatus.APPLIED) {
      throw new ConflictException(`Cannot expire coupon usage with status "${existing.status}".`);
    }

    const expired = await this.transactionService.run(async (tx: PrismaTransaction) => {
      await this.couponRepo.decrementUsage(existing.couponId, 1, undefined, tx);
      return this.couponUsageRepo.expire(usageId, tx);
    });

    const entity = new CouponUsageEntity(expired);

    await this.auditService.log({
      action: 'COUPON_EXPIRED',
      entityType: 'CouponUsage',
      entityId: entity.id,
      actorId,
      metadata: {
        salonId: entity.salonId,
        branchId: entity.branchId,
      },
      newState: { status: CouponUsageStatus.EXPIRED },
    });

    return entity;
  }

  public async getUsageById(id: string, salonId?: string): Promise<CouponUsageEntity> {
    const usage = await this.couponUsageRepo.findById(id, salonId);
    if (!usage) {
      throw new NotFoundException(`Coupon usage with id ${id} not found.`);
    }
    return new CouponUsageEntity(usage);
  }

  public async searchUsages(
    query: SearchCouponUsageQueryDto,
  ): Promise<{ data: CouponUsageEntity[]; total: number }> {
    const res = await this.couponUsageRepo.search(query);
    return {
      data: res.data.map((u) => new CouponUsageEntity(u)),
      total: res.total,
    };
  }

  public async aggregateUsage(
    couponId: string,
    salonId?: string,
  ): Promise<CouponUsageAggregationResult> {
    return this.couponUsageRepo.aggregateUsage(couponId, salonId);
  }
}
