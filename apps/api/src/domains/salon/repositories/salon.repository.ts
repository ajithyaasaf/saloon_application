import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Salon } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PaginationMeta } from '../../../common/types/pagination.type';
import { PaginationUtil } from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { SearchSalonQueryDto } from '../dto/search-salon-query.dto';
import { ISalonRepository } from './interfaces/salon.repository.interface';

/**
 * SalonRepository — Prisma data access implementation for Salon aggregate root.
 *
 * Thread Safety: 100% Thread-Safe.
 * Soft Delete: Excludes `deletedAt != null` records automatically.
 * Optimistic Concurrency: Validates and increments `version` on updates.
 *
 * Architecture ref: Phase 10.0 & Phase 10.2
 */
@Injectable()
export class SalonRepository implements ISalonRepository {
  private readonly logger = new Logger(SalonRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<Salon | null> {
    const client = tx ?? this.prisma;
    return client.salon.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  public async findBySlug(slug: string, tx?: PrismaTransaction): Promise<Salon | null> {
    const client = tx ?? this.prisma;
    return client.salon.findFirst({
      where: {
        slug,
        deletedAt: null,
      },
    });
  }

  public async findByOwnerId(ownerId: string, tx?: PrismaTransaction): Promise<Salon[]> {
    const client = tx ?? this.prisma;
    return client.salon.findMany({
      where: {
        ownerId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async create(data: Prisma.SalonUncheckedCreateInput, tx?: PrismaTransaction): Promise<Salon> {
    const client = tx ?? this.prisma;
    try {
      return await client.salon.create({
        data: {
          ...data,
          version: 1,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Salon creation failed';
      this.logger.error(`SalonRepository.create error: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  public async update(
    id: string,
    expectedVersion: number,
    data: Prisma.SalonUncheckedUpdateInput,
    tx?: PrismaTransaction,
  ): Promise<Salon> {
    const client = tx ?? this.prisma;
    const existing = await this.findById(id, tx);
    if (!existing) {
      throw new DatabaseException(`Salon with ID ${id} not found`);
    }

    if (existing.version !== expectedVersion) {
      throw new ConflictException(
        ERROR_CODES.DATABASE.UNIQUE_VIOLATION,
        `Optimistic concurrency failure: Salon ${id} has version ${existing.version}, expected ${expectedVersion}`,
      );
    }

    try {
      return await client.salon.update({
        where: { id },
        data: {
          ...data,
          version: { increment: 1 },
        },
      });
    } catch (error: unknown) {
      if (error instanceof ConflictException) throw error;
      const message = error instanceof Error ? error.message : 'Salon update failed';
      this.logger.error(`SalonRepository.update error: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  public async softDelete(id: string, expectedVersion: number, tx?: PrismaTransaction): Promise<void> {
    await this.update(id, expectedVersion, { deletedAt: new Date() }, tx);
  }

  public async findAll(query: SearchSalonQueryDto, tx?: PrismaTransaction): Promise<{ data: Salon[]; meta: PaginationMeta }> {
    const client = tx ?? this.prisma;
    const normParams = PaginationUtil.normalizeParams(query.page, query.limit);
    const { skip, take } = PaginationUtil.getSkipTake(normParams);

    const where: Prisma.SalonWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.planType ? { planType: query.planType } : {}),
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.search
        ? {
            OR: [
              { brandName: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, totalItems] = await Promise.all([
      client.salon.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: query.sortOrder === 'ASC' ? 'asc' : 'desc' },
      }),
      client.salon.count({ where }),
    ]);

    const meta = PaginationUtil.buildMeta(totalItems, normParams);
    return { data: items, meta };
  }
}
