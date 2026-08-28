import { Prisma, Salon } from '@prisma/client';
import { PaginationMeta } from '../../../../common/types/pagination.type';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';
import { SearchSalonQueryDto } from '../../dto/search-salon-query.dto';

/**
 * ISalonRepository — Public interface contract for Salon database operations.
 *
 * Architecture ref: Phase 10.0 & Phase 10.2
 */
export interface ISalonRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<Salon | null>;
  findBySlug(slug: string, tx?: PrismaTransaction): Promise<Salon | null>;
  findByOwnerId(ownerId: string, tx?: PrismaTransaction): Promise<Salon[]>;
  create(data: Prisma.SalonUncheckedCreateInput, tx?: PrismaTransaction): Promise<Salon>;
  update(id: string, expectedVersion: number, data: Prisma.SalonUncheckedUpdateInput, tx?: PrismaTransaction): Promise<Salon>;
  softDelete(id: string, expectedVersion: number, tx?: PrismaTransaction): Promise<void>;
  findAll(query: SearchSalonQueryDto, tx?: PrismaTransaction): Promise<{ data: Salon[]; meta: PaginationMeta }>;
}
