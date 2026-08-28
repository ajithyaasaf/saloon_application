import { GiftCardStatus, GiftCardTransactionType } from '@prisma/client';

export class CustomerGiftCardResponseDto {
  id: string;
  maskedCode: string;
  salonId: string;
  recipientName?: string | null;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  personalMessage?: string | null;
  initialBalance: number;
  currentBalance: number;
  currency: string;
  status: GiftCardStatus;
  expiresAt: Date;
  isExpired: boolean;
  isRedeemable: boolean;
  createdAt: Date;
}

export class OwnerGiftCardResponseDto extends CustomerGiftCardResponseDto {
  giftCardCode: string; // Full code visible to salon owner/staff for operational redemption
  purchasedByUserId?: string | null;
  version: number;
  updatedAt: Date;
}

export class GiftCardBalanceResponseDto {
  giftCardId: string;
  maskedCode: string;
  currentBalance: number;
  initialBalance: number;
  currency: string;
  status: GiftCardStatus;
  expiresAt: Date;
  isRedeemable: boolean;
}

export class GiftCardTransactionResponseDto {
  id: string;
  giftCardId: string;
  bookingId?: string | null;
  invoiceId?: string | null;
  transactionType: GiftCardTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  notes?: string | null;
  createdAt: Date;
}

export class GiftCardRedemptionResultDto {
  giftCard: CustomerGiftCardResponseDto;
  amountRedeemed: number;
  remainingBalance: number;
}
