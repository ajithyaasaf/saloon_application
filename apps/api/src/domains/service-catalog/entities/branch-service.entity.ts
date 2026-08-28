import { ServiceStatus } from '@prisma/client';

/**
 * BranchServiceEntity — Pure domain entity for branch service offering and pricing.
 * Free of NestJS, Prisma, and framework decorators.
 *
 * Architecture ref: Phase 11.0 & Phase 11.3
 */
export class BranchServiceEntity {
  constructor(
    public readonly id: string,
    public readonly branchId: string,
    public readonly serviceId: string,
    public price: number,
    public durationMinutes: number,
    public status: ServiceStatus,
    public isActiveFlag: boolean,
    public version: number,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public deletedAt: Date | null = null,
  ) {}

  public isAvailable(): boolean {
    return this.status === ServiceStatus.ACTIVE && this.isActiveFlag && this.deletedAt === null;
  }

  public isDraft(): boolean {
    return this.status === ServiceStatus.DRAFT;
  }

  public isInactive(): boolean {
    return this.status === ServiceStatus.INACTIVE || !this.isActiveFlag;
  }

  public isArchived(): boolean {
    return this.status === ServiceStatus.ARCHIVED || this.deletedAt !== null;
  }
}
