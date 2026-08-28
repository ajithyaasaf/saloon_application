import { Prisma, StaffBranchAssignment } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';

/**
 * IStaffBranchAssignmentRepository — Data access contract for staff branch assignments.
 *
 * Architecture ref: Phase 12.0 & Phase 12.2
 */
export interface IStaffBranchAssignmentRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<StaffBranchAssignment | null>;
  findAssignments(staffId: string, tx?: PrismaTransaction): Promise<StaffBranchAssignment[]>;
  findPrimaryBranch(staffId: string, tx?: PrismaTransaction): Promise<StaffBranchAssignment | null>;
  findByBranch(branchId: string, tx?: PrismaTransaction): Promise<StaffBranchAssignment[]>;
  create(data: Prisma.StaffBranchAssignmentUncheckedCreateInput, tx?: PrismaTransaction): Promise<StaffBranchAssignment>;
  update(
    id: string,
    expectedVersion: number,
    data: Prisma.StaffBranchAssignmentUncheckedUpdateInput,
    tx?: PrismaTransaction,
  ): Promise<StaffBranchAssignment>;
  softDelete(id: string, expectedVersion: number, tx?: PrismaTransaction): Promise<void>;
}
