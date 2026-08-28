import { BookingStatus, PaymentStatus, WalkInType } from '@prisma/client';
import { BookingItemEntity } from './booking-item.entity';
import { BookingStatusHistoryEntity } from './booking-status-history.entity';

/**
 * BookingEntity — Pure TypeScript Domain Entity for Booking Aggregate Root.
 * No NestJS, No Prisma, No database coupling.
 */
export class BookingEntity {
  id: string;
  bookingCode: string;
  sequenceNumber: bigint | number;
  salonId: string;
  branchId: string;
  customerId: string;
  walkInType: WalkInType;
  isWalkIn: boolean;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  cancellationReason?: string | null;
  cancelledByUserId?: string | null;
  cancelledAt?: Date | null;
  rescheduleCount: number;
  bookingDate: Date;
  startTime: Date;
  endTime: Date;
  totalDurationMinutes: number;
  subtotalAmount: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  paymentId?: string | null;
  couponId?: string | null;
  reviewId?: string | null;
  notes?: string | null;
  internalNotes?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
  version: number;
  createdByUserId: string;
  updatedByUserId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  items?: BookingItemEntity[];
  statusHistories?: BookingStatusHistoryEntity[];

  constructor(partial: Partial<BookingEntity>) {
    Object.assign(this, partial);
  }

  public isPending(): boolean {
    return this.status === BookingStatus.PENDING;
  }

  public isConfirmed(): boolean {
    return this.status === BookingStatus.CONFIRMED;
  }

  public isCancelled(): boolean {
    return this.status === BookingStatus.CANCELLED;
  }

  public isCompleted(): boolean {
    return this.status === BookingStatus.COMPLETED;
  }

  public isExpired(): boolean {
    return this.status === BookingStatus.EXPIRED;
  }

  public isNoShow(): boolean {
    return this.status === BookingStatus.NO_SHOW;
  }

  public canCancel(): boolean {
    return this.status === BookingStatus.PENDING || this.status === BookingStatus.CONFIRMED;
  }

  public canCheckIn(): boolean {
    return this.status === BookingStatus.CONFIRMED;
  }

  public canStart(): boolean {
    return this.status === BookingStatus.CHECKED_IN;
  }

  public canComplete(): boolean {
    return this.status === BookingStatus.IN_PROGRESS;
  }
}
