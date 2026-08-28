import { Prisma, ServiceCategory } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';

/**
 * IServiceCategoryRepository — Data access contract for master service categories.
 *
 * Architecture ref: Phase 11.0 & Phase 11.2
 */
export interface IServiceCategoryRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<ServiceCategory | null>;
  findByName(name: string, tx?: PrismaTransaction): Promise<ServiceCategory | null>;
  findAll(tx?: PrismaTransaction): Promise<ServiceCategory[]>;
  create(data: Prisma.ServiceCategoryUncheckedCreateInput, tx?: PrismaTransaction): Promise<ServiceCategory>;
  update(
    id: string,
    expectedVersion: number,
    data: Prisma.ServiceCategoryUncheckedUpdateInput,
    tx?: PrismaTransaction,
  ): Promise<ServiceCategory>;
  softDelete(id: string, expectedVersion: number, tx?: PrismaTransaction): Promise<void>;
}
