import { CustomerTier, LoyaltyTransactionType } from '../../enums/index.js';

export interface CustomerProfileDto {
  id: string;
  userId: string;
  phone: string;
  email?: string | null;
  name: string;
  tier: CustomerTier;
  loyaltyPointsBalance: number;
  walletBalance: number;
  totalBookingsCount: number;
  totalSpentAmount: number;
  favoriteSalonsCount?: number;
  createdAt: string;
}

export interface LoyaltyPointsHistoryDto {
  id: string;
  customerId: string;
  type: LoyaltyTransactionType;
  points: number;
  balanceAfter: number;
  reason?: string | null;
  bookingId?: string | null;
  createdAt: string;
}

export interface WalletTransactionDto {
  id: string;
  customerId: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  balanceAfter: number;
  description: string;
  createdAt: string;
}

export interface FavoriteSalonItemDto {
  id: string;
  salonId: string;
  salonName: string;
  slug: string;
  logoUrl?: string | null;
  ratingAverage?: number;
  reviewsCount?: number;
  savedAt: string;
}

export interface AddFavoriteSalonRequestDto {
  salonId: string;
}

export type LoyaltyAccountDto = CustomerProfileDto;
export interface WalletBalanceDto {
  walletBalance: number;
  currency?: string;
}
export interface MembershipTierDto {
  tier: CustomerTier;
  name: string;
  benefits?: string[];
}
