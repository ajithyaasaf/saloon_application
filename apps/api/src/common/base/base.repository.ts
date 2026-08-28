import { PrismaService } from '../../infrastructure/database/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * BaseRepository — Abstract base class for all domain repositories.
 *
 * Architecture ref: Phase 5 §3.8 & §17.4
 *
 * Rules:
 * 1. Every domain repository extends BaseRepository.
 * 2. Repositories accept an optional `tx?: Prisma.TransactionClient` parameter in methods.
 * 3. `this.db(tx)` returns `tx` if provided, otherwise `this.prisma`.
 * 4. Repositories handle database query construction, `select`/`include` bounds,
 *    and map raw database operations to typed returns.
 */
export abstract class BaseRepository {
  constructor(protected readonly prisma: PrismaService) {}

  /**
   * Helper to unwrap transaction context.
   * If a transaction client (`tx`) is provided, all operations execute within that transaction.
   * Otherwise, operations fall back to the default `PrismaService` instance.
   */
  protected db(tx?: Prisma.TransactionClient): Prisma.TransactionClient | PrismaService {
    return tx ?? this.prisma;
  }
}
