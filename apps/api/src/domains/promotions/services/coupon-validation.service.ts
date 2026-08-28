import { Injectable } from '@nestjs/common';
import {
  CouponApplicabilityType,
  CouponCustomerEligibilityType,
  CouponDiscountType,
  CouponStatus,
} from '@prisma/client';
import { CouponEntity } from '../entities/coupon.entity';

export interface ValidationCartItem {
  serviceId: string;
  categoryId?: string;
  price: number;
}

export interface ValidateCouponContext {
  coupon: CouponEntity;
  salonId?: string;
  branchId?: string;
  customerId: string;
  customerBookingCount?: number;
  isVip?: boolean;
  hasActiveMembership?: boolean;
  cartItems: ValidationCartItem[];
  checkDate?: Date;
  customerUsageCount?: number;
}

export interface CouponValidationResult {
  isValid: boolean;
  reason?: string;
  discountAmount: number;
  qualifyingAmount: number;
  eligibleItems: ValidationCartItem[];
  appliedCoupon?: CouponEntity;
}

@Injectable()
export class CouponValidationService {
  public validateAndCalculate(context: ValidateCouponContext): CouponValidationResult {
    const {
      coupon,
      salonId,
      branchId,
      customerId,
      customerBookingCount = 0,
      isVip = false,
      hasActiveMembership = false,
      cartItems,
      checkDate = new Date(),
      customerUsageCount = 0,
    } = context;

    // 1. Status & Soft Deletion
    if (coupon.deletedAt || coupon.status !== CouponStatus.ACTIVE) {
      return this.invalidResult('Coupon is inactive or has been archived.');
    }

    // 2. Validity Window
    if (checkDate < coupon.startDate) {
      return this.invalidResult('Coupon promotion has not started yet.');
    }
    if (checkDate > coupon.endDate) {
      return this.invalidResult('Coupon has expired.');
    }

    // 3. Tenant Isolation
    if (coupon.salonId && coupon.salonId !== salonId) {
      return this.invalidResult('Coupon is not valid for this salon.');
    }

    // 4. Total Usage Quota
    if (
      coupon.totalUsageLimit !== null &&
      coupon.totalUsageLimit !== undefined &&
      coupon.currentUsageCount >= coupon.totalUsageLimit
    ) {
      return this.invalidResult('Coupon total redemption limit has been reached.');
    }

    // 5. Per-Customer Usage Limit
    if (customerUsageCount >= coupon.perCustomerLimit) {
      return this.invalidResult(
        `Customer limit reached. You can only use this coupon ${coupon.perCustomerLimit} time(s).`,
      );
    }

    // 6. Day of Week Restriction
    if (coupon.validDaysOfWeek && coupon.validDaysOfWeek.length > 0) {
      const currentDay = checkDate.getDay();
      if (!coupon.validDaysOfWeek.includes(currentDay)) {
        return this.invalidResult('Coupon is not valid on this day of the week.');
      }
    }

    // 7. Happy Hour / Time Window Restriction
    if (coupon.isHappyHour && coupon.validStartTime && coupon.validEndTime) {
      const currentHours = checkDate.getHours().toString().padStart(2, '0');
      const currentMinutes = checkDate.getMinutes().toString().padStart(2, '0');
      const currentSeconds = checkDate.getSeconds().toString().padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}:${currentSeconds}`;

      if (currentTimeStr < coupon.validStartTime || currentTimeStr > coupon.validEndTime) {
        return this.invalidResult(
          `Coupon is only valid during happy hours between ${coupon.validStartTime} and ${coupon.validEndTime}.`,
        );
      }
    }

    // 8. Customer Eligibility
    if (coupon.customerEligibility === CouponCustomerEligibilityType.FIRST_TIME_ONLY) {
      if (customerBookingCount > 0) {
        return this.invalidResult('Coupon is exclusively for first-time customers.');
      }
    } else if (coupon.customerEligibility === CouponCustomerEligibilityType.VIP_ONLY) {
      if (!isVip) {
        return this.invalidResult('Coupon is exclusively for VIP customers.');
      }
    } else if (coupon.customerEligibility === CouponCustomerEligibilityType.MEMBERSHIP_HOLDERS) {
      if (!hasActiveMembership) {
        return this.invalidResult('Coupon is exclusively for active salon membership holders.');
      }
    } else if (coupon.customerEligibility === CouponCustomerEligibilityType.SPECIFIC_CUSTOMERS) {
      const isTargeted = coupon.customerEligibilities?.some(
        (ce) => ce.customerId === customerId,
      );
      if (!isTargeted) {
        return this.invalidResult('Coupon is not available for this account.');
      }
    }

    // 9. Branch Applicability
    if (coupon.applicabilityType === CouponApplicabilityType.SPECIFIC_BRANCHES) {
      const isBranchApplicable = coupon.branchApplicabilities?.some(
        (ba) => ba.branchId === branchId,
      );
      if (!isBranchApplicable) {
        return this.invalidResult('Coupon is not valid for this branch location.');
      }
    }

    // 10. Service / Category Applicability & Eligible Items
    let eligibleItems: ValidationCartItem[] = [];

    if (coupon.applicabilityType === CouponApplicabilityType.ALL_SERVICES) {
      eligibleItems = [...cartItems];
    } else if (coupon.applicabilityType === CouponApplicabilityType.SPECIFIC_SERVICES) {
      const allowedServiceIds = new Set(
        coupon.serviceApplicabilities?.map((sa) => sa.serviceId) ?? [],
      );
      eligibleItems = cartItems.filter((item) => allowedServiceIds.has(item.serviceId));
    } else if (coupon.applicabilityType === CouponApplicabilityType.SPECIFIC_CATEGORIES) {
      const allowedCategoryIds = new Set(
        coupon.categoryApplicabilities?.map((ca) => ca.categoryId) ?? [],
      );
      eligibleItems = cartItems.filter(
        (item) => item.categoryId && allowedCategoryIds.has(item.categoryId),
      );
    } else {
      eligibleItems = [...cartItems];
    }

    if (eligibleItems.length === 0) {
      return this.invalidResult('No items in the cart qualify for this coupon promotion.');
    }

    // 11. Minimum Service Count
    if (cartItems.length < coupon.minServicesCount) {
      return this.invalidResult(
        `Minimum of ${coupon.minServicesCount} service(s) required to use this coupon.`,
      );
    }

    const cartTotalAmount = cartItems.reduce((sum, item) => sum + item.price, 0);
    const qualifyingAmount = eligibleItems.reduce((sum, item) => sum + item.price, 0);

    // 12. Minimum Booking Amount
    if (cartTotalAmount < coupon.minBookingAmount) {
      return this.invalidResult(
        `Minimum booking amount of ₹${coupon.minBookingAmount / 100} required to apply this coupon.`,
      );
    }

    // 13. Deterministic Discount Calculation
    let discountAmount = 0;
    const discountVal = Number(coupon.discountValue);

    switch (coupon.discountType) {
      case CouponDiscountType.PERCENTAGE: {
        discountAmount = Math.round((qualifyingAmount * discountVal) / 100);
        if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
          discountAmount = coupon.maxDiscountAmount;
        }
        break;
      }
      case CouponDiscountType.FIXED_AMOUNT: {
        discountAmount = Math.min(discountVal, qualifyingAmount);
        break;
      }
      case CouponDiscountType.FREE_SERVICE: {
        // Free service gives 100% off the lowest qualifying item
        const lowestPriceItem = [...eligibleItems].sort((a, b) => a.price - b.price)[0];
        discountAmount = lowestPriceItem ? lowestPriceItem.price : 0;
        break;
      }
      case CouponDiscountType.CASHBACK: {
        // Cashback calculation (tracked as discount savings / future wallet reward)
        discountAmount = Math.round((qualifyingAmount * discountVal) / 100);
        if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
          discountAmount = coupon.maxDiscountAmount;
        }
        break;
      }
      default:
        discountAmount = 0;
    }

    // Discount cannot exceed qualifying amount or total cart amount
    discountAmount = Math.min(discountAmount, qualifyingAmount, cartTotalAmount);

    return {
      isValid: true,
      discountAmount,
      qualifyingAmount,
      eligibleItems,
      appliedCoupon: coupon,
    };
  }

  private invalidResult(reason: string): CouponValidationResult {
    return {
      isValid: false,
      reason,
      discountAmount: 0,
      qualifyingAmount: 0,
      eligibleItems: [],
    };
  }
}
