import { MembershipStatus } from '@prisma/client';

export class MembershipPlanEntity {
  id: string;
  salonId: string;
  planCode: string;
  name: string;
  description?: string | null;
  price: number;
  validityDays: number;
  discountPercentage: number;
  benefits?: any;
  isActive: boolean;
  version: number;
  createdByUserId: string;
  updatedByUserId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  constructor(partial: Partial<MembershipPlanEntity>) {
    Object.assign(this, partial);
  }
}

export class CustomerMembershipEntity {
  id: string;
  customerProfileId: string;
  membershipPlanId: string;
  status: MembershipStatus;
  startDate: Date;
  endDate: Date;
  pricePaid: number;
  discountPercentage: number;
  autoRenew: boolean;
  version: number;
  createdByUserId: string;
  updatedByUserId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  constructor(partial: Partial<CustomerMembershipEntity>) {
    Object.assign(this, partial);
  }

  public isActive(): boolean {
    const now = new Date();
    return this.status === MembershipStatus.ACTIVE && this.endDate >= now && !this.deletedAt;
  }

  public isExpired(): boolean {
    const now = new Date();
    return this.status === MembershipStatus.EXPIRED || this.endDate < now;
  }

  public isPaused(): boolean {
    return this.status === MembershipStatus.PAUSED;
  }

  public remainingDays(): number {
    const now = new Date();
    if (this.endDate < now) return 0;
    const diffTime = Math.abs(this.endDate.getTime() - now.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
