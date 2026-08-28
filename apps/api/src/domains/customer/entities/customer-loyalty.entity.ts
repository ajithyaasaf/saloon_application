import { LoyaltyTransactionType } from '@prisma/client';

export class CustomerLoyaltyEntity {
  id: string;
  customerProfileId: string;
  pointsBalance: number;
  lifetimePointsEarned: number;
  currentTier: string;
  version: number;
  updatedAt: Date;

  constructor(partial: Partial<CustomerLoyaltyEntity>) {
    Object.assign(this, partial);
  }

  public canRedeem(points: number): boolean {
    return points > 0 && this.pointsBalance >= points;
  }

  public getTier(): string {
    return this.currentTier ?? 'SILVER';
  }

  public availablePoints(): number {
    return Math.max(0, this.pointsBalance);
  }
}

export class LoyaltyLedgerEntity {
  id: string;
  customerProfileId: string;
  type: LoyaltyTransactionType;
  points: number;
  previousBalance: number;
  newBalance: number;
  referenceType?: string | null;
  referenceId?: string | null;
  description?: string | null;
  createdByUserId: string;
  createdAt: Date;

  constructor(partial: Partial<LoyaltyLedgerEntity>) {
    Object.assign(this, partial);
  }
}
