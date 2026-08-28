import { BranchService, Prisma } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';

/**
 * IBranchServiceRepository — Data access contract for branch service offerings and prices.
 *
 * Architecture ref: Phase 11.0 & Phase 11.2
 */
export interface IBranchServiceRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<BranchService | null>;
  findByBranch(branchId: string, tx?: PrismaTransaction): Promise<BranchService[]>;
  findByService(serviceId: string, tx?: PrismaTransaction): Promise<BranchService[]>;
  findBranchService(branchId: string, serviceId: string, tx?: PrismaTransaction): Promise<BranchService | null>;
  create(data: Prisma.BranchServiceUncheckedCreateInput, tx?: PrismaTransaction): Promise<BranchService>;
  update(
    id: string,
    expectedVersion: number,
    data: Prisma.BranchServiceUncheckedUpdateInput,
    tx?: PrismaTransaction,
  ): Promise<BranchService>;
  softDelete(id: string, expectedVersion: number, tx?: PrismaTransaction): Promise<void>;
  updatePrice(id: string, expectedVersion: number, newPrice: number, tx?: PrismaTransaction): Promise<BranchService>;
  listActive(branchId: string, tx?: PrismaTransaction): Promise<BranchService[]>;
}
