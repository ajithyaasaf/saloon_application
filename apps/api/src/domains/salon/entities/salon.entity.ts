import { SalonPlanType, SalonStatus } from '@prisma/client';

/**
 * SalonEntity — Pure domain entity representing a Salon aggregate root.
 *
 * Architecture ref: Phase 10.0 & Phase 10.3
 */
export class SalonEntity {
  constructor(
    public readonly id: string,
    public readonly ownerId: string,
    public readonly brandName: string,
    public readonly slug: string | null,
    public readonly description: string | null,
    public readonly gstin: string | null,
    public readonly planType: SalonPlanType,
    public readonly status: SalonStatus,
    public readonly logoMediaId: string | null,
    public readonly version: number,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly deletedAt: Date | null,
  ) {}

  public isApproved(): boolean {
    return this.status === 'APPROVED';
  }

  public isPendingApproval(): boolean {
    return this.status === 'PENDING_APPROVAL';
  }

  public isDraft(): boolean {
    return this.status === 'DRAFT';
  }

  public isSuspended(): boolean {
    return this.status === 'SUSPENDED';
  }

  public isArchived(): boolean {
    return this.deletedAt !== null || this.status === 'ARCHIVED';
  }
}
