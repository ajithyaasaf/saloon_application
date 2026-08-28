import { BranchGenderCategory, SalonStatus } from '@prisma/client';

/**
 * BranchEntity — Pure domain entity representing a Salon branch location.
 *
 * Architecture ref: Phase 10.0 & Phase 10.3
 */
export class BranchEntity {
  constructor(
    public readonly id: string,
    public readonly salonId: string,
    public readonly managerStaffId: string | null,
    public readonly branchName: string,
    public readonly isPrimary: boolean,
    public readonly addressLine1: string,
    public readonly addressLine2: string | null,
    public readonly city: string,
    public readonly state: string,
    public readonly pincode: string,
    public readonly latitude: number,
    public readonly longitude: number,
    public readonly phone: string,
    public readonly genderCategory: BranchGenderCategory,
    public readonly coverMediaId: string | null,
    public readonly status: SalonStatus,
    public readonly version: number,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly deletedAt: Date | null,
  ) {}

  public isActive(): boolean {
    return this.deletedAt === null && this.status === 'APPROVED';
  }
}
