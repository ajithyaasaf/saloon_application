import {
  CouponApplicabilityType,
  CouponCustomerEligibilityType,
  CouponDiscountType,
  CouponStatus,
} from '@prisma/client';

export class CouponEntity {
  id: string;
  salonId?: string | null;
  code: string;
  name: string;
  description?: string | null;
  discountType: CouponDiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minBookingAmount: number;
  minServicesCount: number;
  applicabilityType: CouponApplicabilityType;
  customerEligibility: CouponCustomerEligibilityType;
  totalUsageLimit?: number | null;
  perCustomerLimit: number;
  currentUsageCount: number;
  isAutoApply: boolean;
  isCombinableWithOtherOffers: boolean;
  isHappyHour: boolean;
  validDaysOfWeek: number[];
  validStartTime?: string | null;
  validEndTime?: string | null;
  startDate: Date;
  endDate: Date;
  status: CouponStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  serviceApplicabilities?: CouponServiceApplicabilityEntity[];
  categoryApplicabilities?: CouponCategoryApplicabilityEntity[];
  branchApplicabilities?: CouponBranchApplicabilityEntity[];
  customerEligibilities?: CouponCustomerEligibilityEntity[];

  constructor(partial: any) {
    Object.assign(this, partial);
    if (partial?.discountValue !== undefined && partial?.discountValue !== null) {
      this.discountValue = Number(partial.discountValue);
    }
  }

  public isActive(checkDate = new Date()): boolean {
    if (this.status !== CouponStatus.ACTIVE || this.deletedAt) return false;
    return checkDate >= this.startDate && checkDate <= this.endDate;
  }

  public isDepleted(): boolean {
    if (this.totalUsageLimit === null || this.totalUsageLimit === undefined) return false;
    return this.currentUsageCount >= this.totalUsageLimit;
  }

  public canApplyMore(): boolean {
    return this.isActive() && !this.isDepleted();
  }

  public isGlobal(): boolean {
    return !this.salonId;
  }
}

export class CouponServiceApplicabilityEntity {
  id: string;
  couponId: string;
  serviceId: string;

  constructor(partial: any) {
    Object.assign(this, partial);
  }
}

export class CouponCategoryApplicabilityEntity {
  id: string;
  couponId: string;
  categoryId: string;

  constructor(partial: any) {
    Object.assign(this, partial);
  }
}

export class CouponBranchApplicabilityEntity {
  id: string;
  couponId: string;
  branchId: string;

  constructor(partial: any) {
    Object.assign(this, partial);
  }
}

export class CouponCustomerEligibilityEntity {
  id: string;
  couponId: string;
  customerId: string;

  constructor(partial: any) {
    Object.assign(this, partial);
  }
}
