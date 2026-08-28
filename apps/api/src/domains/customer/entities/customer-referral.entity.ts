import { ReferralStatus } from '@prisma/client';

export class CustomerReferralEntity {
  id: string;
  referrerCustomerProfileId: string;
  referredPhone: string;
  referredEmail?: string | null;
  referredCustomerProfileId?: string | null;
  status: ReferralStatus;
  rewardPoints: number;
  rewardAmount: number;
  version: number;
  createdByUserId: string;
  updatedByUserId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  constructor(partial: Partial<CustomerReferralEntity>) {
    Object.assign(this, partial);
  }

  public isPending(): boolean {
    return this.status === ReferralStatus.PENDING;
  }

  public isRewarded(): boolean {
    return this.status === ReferralStatus.REWARDED;
  }

  public canReward(): boolean {
    return this.status === ReferralStatus.COMPLETED || this.status === ReferralStatus.PENDING;
  }
}

export class ReferralRewardEntity {
  id: string;
  customerReferralId: string;
  customerProfileId: string;
  rewardType: string;
  amount: number;
  claimedAt?: Date | null;
  createdAt: Date;

  constructor(partial: Partial<ReferralRewardEntity>) {
    Object.assign(this, partial);
  }
}
