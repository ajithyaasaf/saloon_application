import { DayOfWeek } from '@prisma/client';

/**
 * StaffWorkingHoursEntity — Domain entity representing working hours and shifts.
 */
export class StaffWorkingHoursEntity {
  id: string;
  staffId: string;
  branchId: string;
  dayOfWeek: DayOfWeek;
  startTime: Date;
  endTime: Date;
  isActive: boolean;
  effectiveFrom: Date;
  effectiveUntil?: Date | null;
  breaks?: Array<{ start: string; end: string }> | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  constructor(props: Partial<StaffWorkingHoursEntity>) {
    Object.assign(this, props);
  }

  public isWorkingDay(): boolean {
    return this.isActive && !this.deletedAt;
  }

  public hasBreaks(): boolean {
    return Array.isArray(this.breaks) && this.breaks.length > 0;
  }
}
