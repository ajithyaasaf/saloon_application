import { Prisma, Staff } from '@prisma/client';
import { PaginationMeta } from '../../../../common/types/pagination.type';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';
import { SearchStaffQueryDto } from '../../dto/search-staff-query.dto';

/**
 * IStaffRepository — Data access contract for Staff aggregate root.
 *
 * Architecture ref: Phase 12.0 & Phase 12.2
 */
export interface IStaffRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<Staff | null>;
  findByUserId(userId: string, tx?: PrismaTransaction): Promise<Staff | null>;
  findBySalon(salonId: string, query?: SearchStaffQueryDto, tx?: PrismaTransaction): Promise<{ data: Staff[]; meta: PaginationMeta }>;
  findByEmployeeCode(salonId: string, employeeCode: string, tx?: PrismaTransaction): Promise<Staff | null>;
  countBySalon(salonId: string, tx?: PrismaTransaction): Promise<number>;
  findActive(salonId: string, tx?: PrismaTransaction): Promise<Staff[]>;
  create(data: Prisma.StaffUncheckedCreateInput, tx?: PrismaTransaction): Promise<Staff>;
  update(
    id: string,
    expectedVersion: number,
    data: Prisma.StaffUncheckedUpdateInput,
    tx?: PrismaTransaction,
  ): Promise<Staff>;
  softDelete(id: string, expectedVersion: number, tx?: PrismaTransaction): Promise<void>;
  search(query: SearchStaffQueryDto, tx?: PrismaTransaction): Promise<{ data: Staff[]; meta: PaginationMeta }>;
}
