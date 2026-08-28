import { Prisma, Service } from '@prisma/client';
import { PaginationMeta } from '../../../../common/types/pagination.type';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';
import { SearchServiceQueryDto } from '../../dto/search-service-query.dto';

/**
 * IServiceRepository — Data access contract for master service definitions.
 *
 * Architecture ref: Phase 11.0 & Phase 11.2
 */
export interface IServiceRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<Service | null>;
  findByCategory(categoryId: string, tx?: PrismaTransaction): Promise<Service[]>;
  findAll(tx?: PrismaTransaction): Promise<Service[]>;
  search(query: SearchServiceQueryDto, tx?: PrismaTransaction): Promise<{ data: Service[]; meta: PaginationMeta }>;
  create(data: Prisma.ServiceUncheckedCreateInput, tx?: PrismaTransaction): Promise<Service>;
  update(
    id: string,
    expectedVersion: number,
    data: Prisma.ServiceUncheckedUpdateInput,
    tx?: PrismaTransaction,
  ): Promise<Service>;
  softDelete(id: string, expectedVersion: number, tx?: PrismaTransaction): Promise<void>;
}
