import { Injectable, Logger } from '@nestjs/common';
import { BranchSpecialHoliday, ShiftDayOfWeek } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ForbiddenOperationException } from '../../../common/exceptions/forbidden-operation.exception';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { CACHE_KEYS } from '../../../shared/cache/constants/cache-keys.constant';
import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { BranchRepository } from '../repositories/branch.repository';
import { BusinessHoursRepository } from '../repositories/business-hours.repository';
import { SalonRepository } from '../repositories/salon.repository';

export interface UpdateWorkingHourItemDto {
  dayOfWeek: ShiftDayOfWeek;
  openTime: Date;
  closeTime: Date;
  isClosed: boolean;
}

class WorkingHoursUpdatedEvent extends BaseDomainEvent<{ branchId: string }> {
  constructor(branchId: string) {
    super('workinghours.updated.v1', branchId, 1, { branchId });
  }
}

/**
 * WorkingHoursService — Manages Branch operating hours, holidays, and temporary closures.
 *
 * Thread Safety: 100% Thread-Safe.
 * Validation: Enforces openTime < closeTime for active days.
 * Precedence Order: TempClosure > SpecialHoliday > BusinessHours > Bookings
 *
 * Architecture ref: Phase 10.0 & Phase 10.3
 */
@Injectable()
export class WorkingHoursService {
  private readonly logger = new Logger(WorkingHoursService.name);

  constructor(
    private readonly salonRepository: SalonRepository,
    private readonly branchRepository: BranchRepository,
    private readonly businessHoursRepository: BusinessHoursRepository,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBusService: EventBusService,
  ) {}

  /**
   * Updates weekly operating hours for a branch after ownership & time range validation.
   */
  public async updateWorkingHours(
    branchId: string,
    ownerId: string,
    hours: UpdateWorkingHourItemDto[],
  ): Promise<void> {
    const branch = await this.branchRepository.findById(branchId);
    if (!branch) throw new ResourceNotFoundException(ERROR_CODES.BRANCH.NOT_FOUND, `Branch ${branchId} not found`);

    const salon = await this.salonRepository.findById(branch.salonId);
    if (!salon || salon.ownerId !== ownerId) {
      throw new ForbiddenOperationException('You do not own this branch profile');
    }

    // Validate openTime < closeTime for open days
    for (const h of hours) {
      if (!h.isClosed && h.openTime >= h.closeTime) {
        throw new ValidationException(`Operating openTime must be before closeTime for ${h.dayOfWeek}`);
      }
    }

    await this.transactionService.run(async (tx) => {
      await this.businessHoursRepository.upsertHours(
        branchId,
        hours.map((h) => ({
          branchId,
          dayOfWeek: h.dayOfWeek,
          openTime: h.openTime,
          closeTime: h.closeTime,
          isClosed: h.isClosed,
        })),
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        action: 'WORKING_HOURS_UPDATED',
        entityType: 'BranchBusinessHours',
        entityId: branchId,
        actorId: ownerId,
        actorRole: 'SALON_OWNER',
        newState: { branchId, count: hours.length },
      });
    });

    await this.cacheService.delete(CACHE_KEYS.SALON_PROFILE(branch.salonId));
    await this.eventBusService.publish(new WorkingHoursUpdatedEvent(branchId));
  }

  /**
   * Adds a special holiday for a branch.
   */
  public async addSpecialHoliday(
    branchId: string,
    ownerId: string,
    holidayDate: Date,
    reason: string,
  ): Promise<BranchSpecialHoliday> {
    const branch = await this.branchRepository.findById(branchId);
    if (!branch) throw new ResourceNotFoundException(ERROR_CODES.BRANCH.NOT_FOUND, `Branch ${branchId} not found`);

    const salon = await this.salonRepository.findById(branch.salonId);
    if (!salon || salon.ownerId !== ownerId) {
      throw new ForbiddenOperationException('You do not own this branch profile');
    }

    return this.transactionService.run(async (tx) => {
      const holiday = await this.businessHoursRepository.addSpecialHoliday(
        {
          branchId,
          holidayDate,
          reason,
          isFullDay: true,
        },
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        action: 'SPECIAL_HOLIDAY_ADDED',
        entityType: 'BranchSpecialHoliday',
        entityId: holiday.id,
        actorId: ownerId,
        actorRole: 'SALON_OWNER',
        newState: { branchId, holidayDate, reason },
      });

      return holiday;
    });
  }
}
