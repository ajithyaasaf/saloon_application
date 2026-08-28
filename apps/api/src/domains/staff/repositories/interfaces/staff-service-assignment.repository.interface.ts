import { Prisma, StaffServiceAssignment } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';

/**
 * IStaffServiceAssignmentRepository — Data access contract for staff service capability assignments.
 *
 * Architecture ref: Phase 12.0 & Phase 12.2
 */
export interface IStaffServiceAssignmentRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<StaffServiceAssignment | null>;
  findByStaff(staffId: string, tx?: PrismaTransaction): Promise<StaffServiceAssignment[]>;
  findByBranchService(branchServiceId: string, tx?: PrismaTransaction): Promise<StaffServiceAssignment[]>;
  findAssignment(staffId: string, branchServiceId: string, tx?: PrismaTransaction): Promise<StaffServiceAssignment | null>;
  create(data: Prisma.StaffServiceAssignmentUncheckedCreateInput, tx?: PrismaTransaction): Promise<StaffServiceAssignment>;
  update(
    id: string,
    expectedVersion: number,
    data: Prisma.StaffServiceAssignmentUncheckedUpdateInput,
    tx?: PrismaTransaction,
  ): Promise<StaffServiceAssignment>;
  softDelete(id: string, expectedVersion: number, tx?: PrismaTransaction): Promise<void>;
}
