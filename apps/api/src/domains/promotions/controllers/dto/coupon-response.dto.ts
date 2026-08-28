import {
  CouponApplicabilityType,
  CouponCustomerEligibilityType,
  CouponDiscountType,
  CouponStatus,
  CouponUsageStatus,
} from '@prisma/client';

export class PublicCouponResponseDto {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  discountType: CouponDiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minBookingAmount: number;
  minServicesCount: number;
  isAutoApply: boolean;
  isHappyHour: boolean;
  validDaysOfWeek: number[];
  validStartTime?: string | null;
  validEndTime?: string | null;
  startDate: Date;
  endDate: Date;
  isGlobal: boolean;
}

export class CustomerCouponResponseDto extends PublicCouponResponseDto {
  salonId?: string | null;
  applicabilityType: CouponApplicabilityType;
  customerEligibility: CouponCustomerEligibilityType;
  perCustomerLimit: number;
  isCombinableWithOtherOffers: boolean;
}

export class OwnerCouponResponseDto extends CustomerCouponResponseDto {
  totalUsageLimit?: number | null;
  currentUsageCount: number;
  status: CouponStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  isDepleted: boolean;
}

export class CouponValidationResponseDto {
  isValid: boolean;
  reason?: string;
  discountAmount: number;
  qualifyingAmount: number;
  eligibleItems: Array<{ serviceId: string; price: number; categoryId?: string }>;
}

export class CouponUsageResponseDto {
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
}

export class CouponApplicabilityResponseDto {
  services: Array<{ id: string; serviceId: string }>;
  categories: Array<{ id: string; categoryId: string }>;
  branches: Array<{ id: string; branchId: string }>;
  customers: Array<{ id: string; customerId: string }>;
}
