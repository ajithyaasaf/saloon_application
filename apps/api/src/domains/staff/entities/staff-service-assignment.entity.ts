/**
 * StaffServiceAssignmentEntity — Domain entity representing staff capability to perform a branch service.
 */
export class StaffServiceAssignmentEntity {
  id: string;
  staffId: string;
  branchServiceId: string;
  isActive: boolean;
  assignedAt: Date;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  constructor(props: Partial<StaffServiceAssignmentEntity>) {
    Object.assign(this, props);
  }

  public isEnabled(): boolean {
    return this.isActive && !this.deletedAt;
  }
}
