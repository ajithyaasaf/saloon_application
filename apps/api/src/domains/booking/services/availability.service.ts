import { Injectable, Logger } from '@nestjs/common';
import { BookingStatus, DayOfWeek, EmploymentStatus, Staff } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { BookingItemRepository } from '../repositories/booking-item.repository';
import { BookingReservationLockRepository } from '../repositories/booking-reservation-lock.repository';

export interface AvailableSlot {
  startTime: Date;
  endTime: Date;
  staffId: string;
}

@Injectable()
export class AvailabilityService {
  private readonly logger = new Logger(AvailabilityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingItemRepository: BookingItemRepository,
    private readonly lockRepository: BookingReservationLockRepository,
  ) {}

  public async checkAvailability(
    branchId: string,
    date: Date | string,
    serviceIds: string[],
    staffId?: string,
  ): Promise<boolean> {
    const slots = await this.findAvailableSlots(branchId, date, serviceIds, staffId);
    return slots.length > 0;
  }

  public async findAvailableStaff(
    branchId: string,
    date: Date | string,
    startTime: Date,
    endTime: Date,
    serviceId?: string,
  ): Promise<Staff[]> {
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    const dayOfWeekStr = this.getDayOfWeekEnum(targetDate);

    // 1. Check branch operating status
    const isClosed = await this.isBranchClosedOnDate(branchId, targetDate);
    if (isClosed) {
      return [];
    }

    // 2. Fetch staff assigned to branch and service (if specified)
    const eligibleStaff = await this.prisma.staff.findMany({
      where: {
        salon: { branches: { some: { id: branchId } } },
        employmentStatus: EmploymentStatus.ACTIVE,
        deletedAt: null,
        ...(serviceId
          ? {
              serviceAssignments: {
                some: {
                  branchServiceId: serviceId,
                  isActive: true,
                },
              },
            }
          : {}),
      },
    });

    if (eligibleStaff.length === 0) {
      return [];
    }

    const availableStaff: Staff[] = [];

    for (const staff of eligibleStaff) {
      const isStaffOnLeave = await this.isStaffOnLeave(staff.id, targetDate, startTime, endTime);
      if (isStaffOnLeave) continue;

      const isWorking = await this.isStaffWorking(staff.id, branchId, dayOfWeekStr, startTime, endTime);
      if (!isWorking) continue;

      const hasBookingOverlap = await this.hasBookingOverlap(staff.id, startTime, endTime);
      if (hasBookingOverlap) continue;

      const hasLockOverlap = await this.hasLockOverlap(branchId, staff.id, startTime, endTime);
      if (hasLockOverlap) continue;

      availableStaff.push(staff);
    }

    return availableStaff;
  }

  public async findAvailableSlots(
    branchId: string,
    date: Date | string,
    serviceIds: string[],
    staffId?: string,
  ): Promise<AvailableSlot[]> {
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    const isClosed = await this.isBranchClosedOnDate(branchId, targetDate);
    if (isClosed) {
      return [];
    }

    // Fetch branch services to calculate duration
    const branchServices = await this.prisma.branchService.findMany({
      where: {
        id: { in: serviceIds },
        branchId,
        isActive: true,
        deletedAt: null,
      },
    });

    if (branchServices.length !== serviceIds.length) {
      return []; // Invalid service list
    }

    const totalDurationMinutes = branchServices.reduce((sum, s) => sum + s.durationMinutes, 0);

    // Business hours window
    const dayOfWeekShift = this.getShiftDayOfWeekEnum(targetDate);
    const businessHours = await this.prisma.branchBusinessHours.findFirst({
      where: {
        branchId,
        dayOfWeek: dayOfWeekShift,
        isClosed: false,
      },
    });

    if (!businessHours) {
      return [];
    }

    // Candidate slots generation in 15-min intervals
    const openDate = this.combineDateAndTime(targetDate, businessHours.openTime);
    const closeDate = this.combineDateAndTime(targetDate, businessHours.closeTime);

    const availableSlots: AvailableSlot[] = [];
    const stepMs = 15 * 60 * 1000;
    const durationMs = totalDurationMinutes * 60 * 1000;

    let currentSlotStart = openDate.getTime();
    while (currentSlotStart + durationMs <= closeDate.getTime()) {
      const slotStart = new Date(currentSlotStart);
      const slotEnd = new Date(currentSlotStart + durationMs);

      const staffList = await this.findAvailableStaff(branchId, targetDate, slotStart, slotEnd, serviceIds[0]);

      const filteredStaff = staffId ? staffList.filter((s) => s.id === staffId) : staffList;

      if (filteredStaff.length > 0) {
        availableSlots.push({
          startTime: slotStart,
          endTime: slotEnd,
          staffId: filteredStaff[0].id,
        });
      }

      currentSlotStart += stepMs;
    }

    return availableSlots;
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  private async isBranchClosedOnDate(branchId: string, date: Date): Promise<boolean> {
    const specialHoliday = await this.prisma.branchSpecialHoliday.findFirst({
      where: {
        branchId,
        holidayDate: date,
        isFullDay: true,
      },
    });
    if (specialHoliday) return true;

    const tempClosure = await this.prisma.branchTempClosure.findFirst({
      where: {
        branchId,
        startTime: { lte: date },
        endTime: { gte: date },
      },
    });

    return !!tempClosure;
  }

  private async isStaffOnLeave(staffId: string, date: Date, start: Date, end: Date): Promise<boolean> {
    const approvedLeave = await this.prisma.staffLeave.findFirst({
      where: {
        staffId,
        status: 'APPROVED',
        deletedAt: null,
        startDate: { lte: date },
        endDate: { gte: date },
      },
    });
    return !!approvedLeave;
  }

  private async isStaffWorking(
    staffId: string,
    branchId: string,
    dayOfWeek: DayOfWeek,
    start: Date,
    end: Date,
  ): Promise<boolean> {
    const workingHours = await this.prisma.staffWorkingHours.findFirst({
      where: {
        staffId,
        branchId,
        dayOfWeek,
        isActive: true,
        deletedAt: null,
      },
    });
    if (!workingHours) return true; // Fallback to branch business hours if no staff shift override

    const shiftStart = this.combineDateAndTime(start, workingHours.startTime);
    const shiftEnd = this.combineDateAndTime(start, workingHours.endTime);

    return start.getTime() >= shiftStart.getTime() && end.getTime() <= shiftEnd.getTime();
  }

  private async hasBookingOverlap(staffId: string, start: Date, end: Date): Promise<boolean> {
    const overlappingItems = await this.bookingItemRepository.findByStaff(staffId, start, end);
    const activeOverlaps = overlappingItems.filter(
      (item) => item.status !== BookingStatus.CANCELLED && item.status !== BookingStatus.EXPIRED,
    );
    return activeOverlaps.length > 0;
  }

  private async hasLockOverlap(branchId: string, staffId: string, start: Date, end: Date): Promise<boolean> {
    const activeLocks = await this.lockRepository.findActive(branchId, staffId);
    return activeLocks.some(
      (lock) => lock.startTime.getTime() < end.getTime() && start.getTime() < lock.endTime.getTime(),
    );
  }

  private getDayOfWeekEnum(date: Date): DayOfWeek {
    const days: DayOfWeek[] = [
      DayOfWeek.SUN,
      DayOfWeek.MON,
      DayOfWeek.TUE,
      DayOfWeek.WED,
      DayOfWeek.THU,
      DayOfWeek.FRI,
      DayOfWeek.SAT,
    ];
    return days[date.getDay()];
  }

  private getShiftDayOfWeekEnum(date: Date): any {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[date.getDay()];
  }

  private combineDateAndTime(date: Date, time: Date): Date {
    const combined = new Date(date);
    combined.setHours(time.getHours(), time.getMinutes(), time.getSeconds(), 0);
    return combined;
  }
}
