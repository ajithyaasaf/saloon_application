import { CouponUsageStatus } from '@prisma/client';

export class CouponUsageEntity {
  id: string;
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
  status: CouponUsageStatus;
  appliedAt: Date;
  settledAt?: Date | null;
  reversedAt?: Date | null;
  reversalReason?: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<CouponUsageEntity>) {
    Object.assign(this, partial);
  }

  public isSettled(): boolean {
    return this.status === CouponUsageStatus.SETTLED;
  }

  public isReversed(): boolean {
    return this.status === CouponUsageStatus.REVERSED;
  }

  public canBeReversed(): boolean {
    return this.status === CouponUsageStatus.APPLIED || this.status === CouponUsageStatus.SETTLED;
  }
}
