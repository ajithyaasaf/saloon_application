import {
  CouponApplicabilityType,
  CouponCustomerEligibilityType,
  CouponDiscountType,
  CouponStatus,
  CouponUsageStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CartItemDto {
  @IsUUID()
  serviceId: string;

  @IsPositive()
  @IsNumber()
  price: number;

  @IsOptional()
  @IsUUID()
  categoryId?: string;
}

export class CreateCouponRequestDto {
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Z0-9_-]+$/i, {
    message: 'Coupon code must contain only alphanumeric characters, dashes, or underscores',
  })
  code: string;

  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(CouponDiscountType)
  discountType: CouponDiscountType;

  @IsPositive()
  @IsNumber()
  discountValue: number;

  @IsOptional()
  @IsPositive()
  @IsNumber()
  maxDiscountAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minBookingAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  minServicesCount?: number;

  @IsOptional()
  @IsEnum(CouponApplicabilityType)
  applicabilityType?: CouponApplicabilityType;

  @IsOptional()
  @IsEnum(CouponCustomerEligibilityType)
  customerEligibility?: CouponCustomerEligibilityType;

  @IsOptional()
  @IsInt()
  @Min(1)
  totalUsageLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  perCustomerLimit?: number;

  @IsOptional()
  @IsBoolean()
  isAutoApply?: boolean;

  @IsOptional()
  @IsBoolean()
  isCombinableWithOtherOffers?: boolean;

  @IsOptional()
  @IsBoolean()
  isHappyHour?: boolean;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  validDaysOfWeek?: number[];

  @IsOptional()
  @IsString()
  validStartTime?: string;

  @IsOptional()
  @IsString()
  validEndTime?: string;

  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @Type(() => Date)
  @IsDate()
  endDate: Date;
}

export class UpdateCouponRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(CouponDiscountType)
  discountType?: CouponDiscountType;

  @IsOptional()
  @IsPositive()
  @IsNumber()
  discountValue?: number;

  @IsOptional()
  @IsPositive()
  @IsNumber()
  maxDiscountAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minBookingAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  minServicesCount?: number;

  @IsOptional()
  @IsEnum(CouponApplicabilityType)
  applicabilityType?: CouponApplicabilityType;

  @IsOptional()
  @IsEnum(CouponCustomerEligibilityType)
  customerEligibility?: CouponCustomerEligibilityType;

  @IsOptional()
  @IsInt()
  @Min(1)
  totalUsageLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  perCustomerLimit?: number;

  @IsOptional()
  @IsBoolean()
  isAutoApply?: boolean;

  @IsOptional()
  @IsBoolean()
  isCombinableWithOtherOffers?: boolean;

  @IsOptional()
  @IsBoolean()
  isHappyHour?: boolean;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  validDaysOfWeek?: number[];

  @IsOptional()
  @IsString()
  validStartTime?: string;

  @IsOptional()
  @IsString()
  validEndTime?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @IsOptional()
  @IsInt()
  @Min(1)
  expectedVersion?: number;
}

export class CouponValidationRequestDto {
  @IsString()
  code: string;

  @IsOptional()
  @IsUUID()
  salonId?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  cartItems: CartItemDto[];

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  checkDate?: Date;
}

export class SetCouponApplicabilityRequestDto {
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  serviceIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  categoryIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  branchIds?: string[];
}

export class SetCouponCustomerEligibilityRequestDto {
  @IsArray()
  @IsUUID('all', { each: true })
  customerIds: string[];
}

export class CouponSearchRequestDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(CouponStatus)
  status?: CouponStatus;

  @IsOptional()
  @IsEnum(CouponDiscountType)
  discountType?: CouponDiscountType;

  @IsOptional()
  @IsUUID()
  salonId?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isAutoApply?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

export class ApplyCouponRequestDto {
  @IsString()
  code: string;

  @IsUUID()
  branchId: string;

  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  cartItems: CartItemDto[];
}

export class SettleCouponUsageRequestDto {
  @IsOptional()
  @IsUUID()
  invoiceId?: string;
}

export class ReverseCouponUsageRequestDto {
  @IsString()
  @MaxLength(500)
  reversalReason: string;
}

export class CouponUsageSearchRequestDto {
  @IsOptional()
  @IsUUID()
  couponId?: string;

  @IsOptional()
  @IsUUID()
  salonId?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @IsOptional()
  @IsEnum(CouponUsageStatus)
  status?: CouponUsageStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
