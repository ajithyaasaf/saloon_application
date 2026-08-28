/**
 * StaffBranchAssignmentEntity — Domain entity representing staff assignment to a branch.
 */
export class StaffBranchAssignmentEntity {
  id: string;
  staffId: string;
  branchId: string;
  isPrimary: boolean;
  startDate: Date;
  endDate?: Date | null;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  constructor(props: Partial<StaffBranchAssignmentEntity>) {
    Object.assign(this, props);
  }

  public isPrimaryAssignment(): boolean {
    return this.isPrimary;
  }

  public isCurrent(targetDate: Date = new Date()): boolean {
    if (!this.isActive || this.deletedAt) return false;
    const dateOnly = new Date(targetDate);
    if (this.startDate > dateOnly) return false;
    if (this.endDate && this.endDate < dateOnly) return false;
    return true;
  }
}
