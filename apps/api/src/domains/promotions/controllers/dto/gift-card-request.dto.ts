import { GiftCardStatus, GiftCardTransactionType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateGiftCardRequestDto {
  @IsPositive()
  @IsNumber()
  initialBalance: number;

  @IsOptional()
  @IsString()
  currency?: string = 'INR';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  recipientName?: string;

  @IsOptional()
  @IsEmail()
  recipientEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  recipientPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  personalMessage?: string;

  @Type(() => Date)
  @IsDate()
  expiresAt: Date;
}

export class CustomerPurchaseGiftCardRequestDto extends CreateGiftCardRequestDto {
  @IsUUID()
  salonId: string;
}

export class RedeemGiftCardRequestDto {
  @IsString()
  giftCardCode: string;

  @IsUUID()
  salonId: string;

  @IsPositive()
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @IsOptional()
  @IsUUID()
  invoiceId?: string;
}

export class RefundCreditGiftCardRequestDto {
  @IsPositive()
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @IsOptional()
  @IsUUID()
  invoiceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CancelGiftCardRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  expectedVersion?: number;
}

export class GiftCardSearchRequestDto {
  @IsOptional()
  @IsUUID()
  salonId?: string;

  @IsOptional()
  @IsString()
  giftCardCode?: string;

  @IsOptional()
  @IsEnum(GiftCardStatus)
  status?: GiftCardStatus;

  @IsOptional()
  @IsUUID()
  purchasedByUserId?: string;

  @IsOptional()
  @IsString()
  recipientEmail?: string;

  @IsOptional()
  @IsString()
  recipientPhone?: string;

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

export class GiftCardTransactionSearchRequestDto {
  @IsOptional()
  @IsUUID()
  giftCardId?: string;

  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @IsOptional()
  @IsUUID()
  invoiceId?: string;

  @IsOptional()
  @IsEnum(GiftCardTransactionType)
  transactionType?: GiftCardTransactionType;

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
