import { Prisma, StaffWorkingHours } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';

/**
 * IStaffWorkingHoursRepository — Data access contract for staff working hours & schedules.
 *
 * Architecture ref: Phase 12.0 & Phase 12.2
 */
export interface IStaffWorkingHoursRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<StaffWorkingHours | null>;
  findHours(staffId: string, branchId?: string, tx?: PrismaTransaction): Promise<StaffWorkingHours[]>;
  findEffectiveOnDate(staffId: string, branchId: string, date: Date, tx?: PrismaTransaction): Promise<StaffWorkingHours[]>;
  upsertHours(data: Prisma.StaffWorkingHoursUncheckedCreateInput, tx?: PrismaTransaction): Promise<StaffWorkingHours>;
  update(
    id: string,
    expectedVersion: number,
    data: Prisma.StaffWorkingHoursUncheckedUpdateInput,
    tx?: PrismaTransaction,
  ): Promise<StaffWorkingHours>;
  deleteHours(id: string, expectedVersion: number, tx?: PrismaTransaction): Promise<void>;
}
