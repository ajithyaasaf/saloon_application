import { CouponEligibilityAudience, DiscountType, FlashSaleStatus, GiftCardStatus } from '../../enums/index.js';

export interface CouponDto {
  id: string;
  salonId: string;
  code: string;
  name: string;
  description?: string | null;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minBookingAmount?: number | null;
  totalUsageLimit?: number | null;
  perCustomerLimit: number;
  audience: CouponEligibilityAudience;
  isAutoApplied: boolean;
  isCombinableWithOtherOffers: boolean;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  timesUsed: number;
}

export interface ValidateCouponRequestDto {
  code: string;
  salonId: string;
  branchId: string;
  bookingAmount: number;
  serviceIds: string[];
}

export interface ValidateCouponResponseDto {
  isValid: boolean;
  discountAmount: number;
  discountType: DiscountType;
  message?: string;
  coupon?: CouponDto;
}

export interface GiftCardDto {
  id: string;
  code: string;
  initialBalance: number;
  currentBalance: number;
  purchasedByUserId: string;
  recipientName?: string | null;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  message?: string | null;
  status: GiftCardStatus;
  expiresAt: string;
  createdAt: string;
}

export interface FlashSaleDto {
  id: string;
  salonId: string;
  branchId: string;
  title: string;
  description?: string | null;
  discountPercentage: number;
  serviceIds: string[];
  startTime: string;
  endTime: string;
  slotsQuota: number;
  slotsRemaining: number;
  status: FlashSaleStatus;
}

export type ValidateCouponDto = ValidateCouponRequestDto;
