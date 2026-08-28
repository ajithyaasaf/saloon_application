import { Injectable, Logger } from '@nestjs/common';
import { StaffWorkingHours } from '@prisma/client';
import { CACHE_KEYS, CACHE_TTL } from '../../../common/constants/cache-keys.constant';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { UpdateWorkingHoursDto } from '../dto/update-working-hours.dto';
import { WorkingHoursUpdatedEvent } from '../events/working-hours-updated.event';
import { StaffWorkingHoursRepository } from '../repositories/staff-working-hours.repository';

/**
 * WorkingHoursService — Domain business logic for staff working hours & schedule management.
 *
 * Architecture ref: Phase 12.0 & Phase 12.3
 */
@Injectable()
export class WorkingHoursService {
  private readonly logger = new Logger(WorkingHoursService.name);

  constructor(
    private readonly hoursRepository: StaffWorkingHoursRepository,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBusService: EventBusService,
  ) {}

  public async updateWorkingHours(
    dto: UpdateWorkingHoursDto,
    staffId: string,
    branchId: string,
    actorId?: string,
  ): Promise<StaffWorkingHours> {
    if (!dto.dayOfWeek) throw new ValidationException('Day of week is required');
    if (!dto.startTime || !dto.endTime) throw new ValidationException('Start time and end time are required');

    const startMinutes = this.timeToMinutes(dto.startTime);
    const endMinutes = this.timeToMinutes(dto.endTime);

    if (startMinutes >= endMinutes) {
      throw new ValidationException(`Shift start time (${dto.startTime}) must be strictly earlier than end time (${dto.endTime})`);
    }

    if (dto.breaks && dto.breaks.length > 0) {
      this.validateBreaks(dto.breaks, startMinutes, endMinutes);
    }

    const startTimeDate = new Date(`1970-01-01T${dto.startTime.length === 5 ? dto.startTime + ':00' : dto.startTime}Z`);
    const endTimeDate = new Date(`1970-01-01T${dto.endTime.length === 5 ? dto.endTime + ':00' : dto.endTime}Z`);

    const updated = await this.transactionService.run(async (tx) => {
      const result = await this.hoursRepository.upsertHours(
        {
          staffId,
          branchId,
          dayOfWeek: dto.dayOfWeek!,
          startTime: startTimeDate,
          endTime: endTimeDate,
          isActive: dto.isActive ?? true,
          effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
          effectiveUntil: dto.effectiveUntil ? new Date(dto.effectiveUntil) : null,
          breaks: (dto.breaks as any) ?? [],
          createdById: actorId ?? null,
          updatedById: actorId ?? null,
        },
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        action: 'WORKING_HOURS_UPDATED',
        entityType: 'StaffWorkingHours',
        entityId: result.id,
        actorId,
        newState: { staffId, branchId, dayOfWeek: dto.dayOfWeek, startTime: dto.startTime, endTime: dto.endTime },
      });

      return result;
    });

    await this.cacheService.delete(CACHE_KEYS.STAFF_SCHEDULE(staffId, branchId));
    await this.eventBusService.publish(new WorkingHoursUpdatedEvent(staffId, branchId));

    return updated;
  }

  public async copyWorkingHours(
    sourceBranchId: string,
    targetBranchId: string,
    staffId: string,
    actorId?: string,
  ): Promise<StaffWorkingHours[]> {
    const sourceHours = await this.hoursRepository.findHours(staffId, sourceBranchId);
    if (sourceHours.length === 0) {
      throw new ValidationException(`No active working hours found for staff ${staffId} at source branch ${sourceBranchId}`);
    }

    const copied = await this.transactionService.run(async (tx) => {
      const results: StaffWorkingHours[] = [];
      for (const h of sourceHours) {
        const created = await this.hoursRepository.upsertHours(
          {
            staffId,
            branchId: targetBranchId,
            dayOfWeek: h.dayOfWeek,
            startTime: h.startTime,
            endTime: h.endTime,
            isActive: h.isActive,
            effectiveFrom: new Date(),
            effectiveUntil: h.effectiveUntil,
            breaks: h.breaks ?? [],
            createdById: actorId ?? null,
            updatedById: actorId ?? null,
          },
          tx,
        );

        await this.auditService.logInTransaction(tx, {
          action: 'WORKING_HOURS_UPDATED',
          entityType: 'StaffWorkingHours',
          entityId: created.id,
          actorId,
          newState: { staffId, branchId: targetBranchId, dayOfWeek: h.dayOfWeek, isCopied: true },
        });

        results.push(created);
      }

      return results;
    });

    await this.cacheService.delete(CACHE_KEYS.STAFF_SCHEDULE(staffId, targetBranchId));
    await this.eventBusService.publish(new WorkingHoursUpdatedEvent(staffId, targetBranchId));

    return copied;
  }

  public async getEffectiveSchedule(staffId: string, branchId: string, targetDate: Date = new Date()): Promise<StaffWorkingHours[]> {
    return this.cacheService.getOrSet(
      CACHE_KEYS.STAFF_SCHEDULE(staffId, branchId),
      async () => {
        return this.hoursRepository.findEffectiveOnDate(staffId, branchId, targetDate);
      },
      CACHE_TTL.STAFF_SCHEDULE,
    );
  }

  private timeToMinutes(timeStr: string): number {
    const parts = timeStr.split(':');
    if (parts.length < 2) return 0;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    return hours * 60 + minutes;
  }

  private validateBreaks(breaks: Array<{ start: string; end: string }>, shiftStart: number, shiftEnd: number): void {
    const sortedBreaks = breaks
      .map((b) => ({
        start: this.timeToMinutes(b.start),
        end: this.timeToMinutes(b.end),
        rawStart: b.start,
        rawEnd: b.end,
      }))
      .sort((a, b) => a.start - b.start);

    for (let i = 0; i < sortedBreaks.length; i++) {
      const b = sortedBreaks[i];

      if (b.start >= b.end) {
        throw new ValidationException(`Break start time (${b.rawStart}) must be earlier than break end time (${b.rawEnd})`);
      }

      if (b.start < shiftStart || b.end > shiftEnd) {
        throw new ValidationException(`Break interval (${b.rawStart}-${b.rawEnd}) must fall entirely inside shift hours`);
      }

      if (i > 0) {
        const prev = sortedBreaks[i - 1];
        if (b.start < prev.end) {
          throw new ValidationException(`Break intervals cannot overlap: (${prev.rawStart}-${prev.rawEnd}) and (${b.rawStart}-${b.rawEnd})`);
        }
      }
    }
  }
}
