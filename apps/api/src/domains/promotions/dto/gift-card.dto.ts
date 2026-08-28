import { GiftCardStatus, GiftCardTransactionType } from '@prisma/client';

export interface CreateGiftCardData {
  giftCardCode: string;
  salonId: string;
  purchasedByUserId?: string | null;
  recipientName?: string | null;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  personalMessage?: string | null;
  initialBalance: number;
  currentBalance: number;
  currency?: string;
  status?: GiftCardStatus;
  expiresAt: Date;
}

export interface UpdateGiftCardData {
  recipientName?: string | null;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  personalMessage?: string | null;
  status?: GiftCardStatus;
  expiresAt?: Date;
}

export interface SearchGiftCardQueryDto {
  salonId?: string;
  giftCardCode?: string;
  purchasedByUserId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  status?: GiftCardStatus;
  isExpired?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'expiresAt' | 'currentBalance';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateGiftCardTransactionData {
  giftCardId: string;
  bookingId?: string | null;
  invoiceId?: string | null;
  transactionType: GiftCardTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  notes?: string | null;
  performedByUserId?: string | null;
}

export interface SearchGiftCardTransactionQueryDto {
  giftCardId?: string;
  bookingId?: string;
  invoiceId?: string;
  transactionType?: GiftCardTransactionType;
  performedByUserId?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt';
  sortOrder?: 'asc' | 'desc';
}
