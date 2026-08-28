import { CouponUsageStatus } from '@prisma/client';

export interface CreateCouponUsageData {
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
  status?: CouponUsageStatus;
  appliedAt?: Date;
  settledAt?: Date | null;
  reversedAt?: Date | null;
  reversalReason?: string | null;
}

export interface UpdateCouponUsageData {
  invoiceId?: string | null;
  status?: CouponUsageStatus;
  settledAt?: Date | null;
  reversedAt?: Date | null;
  reversalReason?: string | null;
}

export interface SearchCouponUsageQueryDto {
  salonId?: string;
  branchId?: string;
  customerId?: string;
  couponId?: string;
  bookingId?: string;
  appointmentId?: string;
  invoiceId?: string;
  status?: CouponUsageStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  sortBy?: 'appliedAt' | 'createdAt' | 'discountAmount';
  sortOrder?: 'asc' | 'desc';
}

export interface CouponUsageAggregationResult {
  totalUsages: number;
  totalDiscountGiven: number;
}
