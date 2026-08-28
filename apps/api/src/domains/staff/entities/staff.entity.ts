import { EmploymentStatus, StaffRole } from '@prisma/client';

/**
 * StaffEntity — Domain entity representing a salon staff member.
 * Pure business logic with zero framework coupling.
 */
export class StaffEntity {
  id: string;
  userId?: string | null;
  salonId: string;
  employeeCode: string;
  displayName: string;
  role: StaffRole;
  customRoleId?: string | null;
  bio?: string | null;
  avatarMediaId?: string | null;
  employmentStatus: EmploymentStatus;
  invitationExpiresAt?: Date | null;
  joinedAt?: Date | null;
  terminatedAt?: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  constructor(props: Partial<StaffEntity>) {
    Object.assign(this, props);
  }

  public isActive(): boolean {
    return this.employmentStatus === EmploymentStatus.ACTIVE && !this.deletedAt;
  }

  public isInvited(): boolean {
    return this.employmentStatus === EmploymentStatus.INVITED;
  }

  public isSuspended(): boolean {
    return this.employmentStatus === EmploymentStatus.SUSPENDED;
  }

  public isTerminated(): boolean {
    return this.employmentStatus === EmploymentStatus.TERMINATED;
  }

  public isArchived(): boolean {
    return this.employmentStatus === EmploymentStatus.ARCHIVED || this.deletedAt != null;
  }
}
