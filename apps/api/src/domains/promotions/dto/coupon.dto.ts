import {
  CouponApplicabilityType,
  CouponCustomerEligibilityType,
  CouponDiscountType,
  CouponStatus,
} from '@prisma/client';

export interface CreateCouponData {
  salonId?: string | null;
  code: string;
  name: string;
  description?: string | null;
  discountType: CouponDiscountType;
  discountValue: number | string;
  maxDiscountAmount?: number | null;
  minBookingAmount?: number;
  minServicesCount?: number;
  applicabilityType?: CouponApplicabilityType;
  customerEligibility?: CouponCustomerEligibilityType;
  totalUsageLimit?: number | null;
  perCustomerLimit?: number;
  isAutoApply?: boolean;
  isCombinableWithOtherOffers?: boolean;
  isHappyHour?: boolean;
  validDaysOfWeek?: number[];
  validStartTime?: string | null;
  validEndTime?: string | null;
  startDate: Date;
  endDate: Date;
  status?: CouponStatus;
}

export interface UpdateCouponData {
  name?: string;
  description?: string | null;
  discountType?: CouponDiscountType;
  discountValue?: number | string;
  maxDiscountAmount?: number | null;
  minBookingAmount?: number;
  minServicesCount?: number;
  applicabilityType?: CouponApplicabilityType;
  customerEligibility?: CouponCustomerEligibilityType;
  totalUsageLimit?: number | null;
  perCustomerLimit?: number;
  isAutoApply?: boolean;
  isCombinableWithOtherOffers?: boolean;
  isHappyHour?: boolean;
  validDaysOfWeek?: number[];
  validStartTime?: string | null;
  validEndTime?: string | null;
  startDate?: Date;
  endDate?: Date;
  status?: CouponStatus;
}

export interface SearchCouponQueryDto {
  salonId?: string;
  search?: string;
  code?: string;
  discountType?: CouponDiscountType;
  status?: CouponStatus;
  isAutoApply?: boolean;
  isHappyHour?: boolean;
  validOnDate?: Date;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'startDate' | 'endDate' | 'currentUsageCount' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateCouponServiceApplicabilityData {
  couponId: string;
  serviceId: string;
}

export interface CreateCouponCategoryApplicabilityData {
  couponId: string;
  categoryId: string;
}

export interface CreateCouponBranchApplicabilityData {
  couponId: string;
  branchId: string;
}

export interface CreateCouponCustomerEligibilityData {
  couponId: string;
  customerId: string;
}
