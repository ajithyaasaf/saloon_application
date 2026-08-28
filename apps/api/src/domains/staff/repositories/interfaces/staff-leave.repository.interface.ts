import { Prisma, StaffLeave } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';

/**
 * IStaffLeaveRepository — Data access contract for staff leave requests and approvals.
 *
 * Architecture ref: Phase 12.0 & Phase 12.2
 */
export interface IStaffLeaveRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<StaffLeave | null>;
  create(data: Prisma.StaffLeaveUncheckedCreateInput, tx?: PrismaTransaction): Promise<StaffLeave>;
  update(
    id: string,
    expectedVersion: number,
    data: Prisma.StaffLeaveUncheckedUpdateInput,
    tx?: PrismaTransaction,
  ): Promise<StaffLeave>;
  findByStaff(staffId: string, tx?: PrismaTransaction): Promise<StaffLeave[]>;
  findPending(staffId?: string, tx?: PrismaTransaction): Promise<StaffLeave[]>;
  findApproved(staffId: string, startDate?: Date, endDate?: Date, tx?: PrismaTransaction): Promise<StaffLeave[]>;
  softDelete(id: string, expectedVersion: number, tx?: PrismaTransaction): Promise<void>;
}
