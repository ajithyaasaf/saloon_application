import { GiftCardStatus, GiftCardTransactionType } from '@prisma/client';

export class GiftCardEntity {
  id: string;
  giftCardCode: string;
  salonId: string;
  purchasedByUserId?: string | null;
  recipientName?: string | null;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  personalMessage?: string | null;
  initialBalance: number;
  currentBalance: number;
  currency: string;
  status: GiftCardStatus;
  expiresAt: Date;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  transactions?: GiftCardTransactionEntity[];

  constructor(partial: Partial<GiftCardEntity>) {
    Object.assign(this, partial);
  }

  public isExpired(checkDate = new Date()): boolean {
    return checkDate > this.expiresAt;
  }

  public isRedeemable(checkDate = new Date()): boolean {
    if (this.deletedAt) return false;
    if (this.status !== GiftCardStatus.ACTIVE && this.status !== GiftCardStatus.PARTIALLY_REDEEMED) {
      return false;
    }
    if (this.isExpired(checkDate)) return false;
    return this.currentBalance > 0;
  }

  public isFullyRedeemed(): boolean {
    return this.currentBalance === 0;
  }

  public canDebit(amount: number): boolean {
    return this.isRedeemable() && this.currentBalance >= amount;
  }

  public canCredit(amount: number): boolean {
    return (
      !this.deletedAt &&
      this.status !== GiftCardStatus.CANCELLED &&
      this.currentBalance + amount <= this.initialBalance
    );
  }
}

export class GiftCardTransactionEntity {
  id: string;
  giftCardId: string;
  bookingId?: string | null;
  invoiceId?: string | null;
  transactionType: GiftCardTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  notes?: string | null;
  performedByUserId?: string | null;
  createdAt: Date;

  constructor(partial: Partial<GiftCardTransactionEntity>) {
    Object.assign(this, partial);
  }
}
