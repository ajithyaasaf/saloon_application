import { Branch, Prisma } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';

/**
 * IBranchRepository — Public interface contract for Branch database operations.
 *
 * Architecture ref: Phase 10.0 & Phase 10.2
 */
export interface IBranchRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<Branch | null>;
  findBySalonId(salonId: string, tx?: PrismaTransaction): Promise<Branch[]>;
  findPrimaryBranch(salonId: string, tx?: PrismaTransaction): Promise<Branch | null>;
  create(data: Prisma.BranchUncheckedCreateInput, tx?: PrismaTransaction): Promise<Branch>;
  update(id: string, expectedVersion: number, data: Prisma.BranchUncheckedUpdateInput, tx?: PrismaTransaction): Promise<Branch>;
  setPrimaryBranch(salonId: string, newPrimaryBranchId: string, tx?: PrismaTransaction): Promise<void>;
  softDelete(id: string, expectedVersion: number, tx?: PrismaTransaction): Promise<void>;
  findNearby(lat: number, lng: number, radiusKm: number, limit?: number, tx?: PrismaTransaction): Promise<Branch[]>;
}
