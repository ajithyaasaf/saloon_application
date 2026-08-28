import { HalfDayPeriod, LeaveStatus, LeaveType } from '@prisma/client';

/**
 * StaffLeaveEntity — Domain entity representing staff leave requests and approvals.
 */
export class StaffLeaveEntity {
  id: string;
  staffId: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  halfDayPeriod?: HalfDayPeriod | null;
  reason?: string | null;
  status: LeaveStatus;
  approvedById?: string | null;
  approvedAt?: Date | null;
  rejectionReason?: string | null;
  isBookingBlocked: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  constructor(props: Partial<StaffLeaveEntity>) {
    Object.assign(this, props);
  }

  public isPending(): boolean {
    return this.status === LeaveStatus.PENDING && !this.deletedAt;
  }

  public isApproved(): boolean {
    return this.status === LeaveStatus.APPROVED && !this.deletedAt;
  }

  public isRejected(): boolean {
    return this.status === LeaveStatus.REJECTED;
  }

  public overlaps(start: Date, end: Date): boolean {
    if (this.deletedAt || this.status === LeaveStatus.CANCELLED || this.status === LeaveStatus.REJECTED) {
      return false;
    }
    return this.startDate <= end && this.endDate >= start;
  }
}
