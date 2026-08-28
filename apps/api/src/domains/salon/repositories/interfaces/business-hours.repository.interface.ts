import { BranchBusinessHours, BranchSpecialHoliday, BranchTempClosure, Prisma } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';

/**
 * IBusinessHoursRepository — Public interface contract for Working Hours & Holidays data access.
 *
 * Architecture ref: Phase 10.0 & Phase 10.2
 */
export interface IBusinessHoursRepository {
  findHoursByBranchId(branchId: string, tx?: PrismaTransaction): Promise<BranchBusinessHours[]>;
  upsertHours(branchId: string, hours: Prisma.BranchBusinessHoursUncheckedCreateInput[], tx?: PrismaTransaction): Promise<void>;
  addSpecialHoliday(data: Prisma.BranchSpecialHolidayUncheckedCreateInput, tx?: PrismaTransaction): Promise<BranchSpecialHoliday>;
  findHolidaysByBranchId(branchId: string, date: Date, tx?: PrismaTransaction): Promise<BranchSpecialHoliday[]>;
  addTempClosure(data: Prisma.BranchTempClosureUncheckedCreateInput, tx?: PrismaTransaction): Promise<BranchTempClosure>;
  findActiveTempClosures(branchId: string, atTime: Date, tx?: PrismaTransaction): Promise<BranchTempClosure[]>;
}
