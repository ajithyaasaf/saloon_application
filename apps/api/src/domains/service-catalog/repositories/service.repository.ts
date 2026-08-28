import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Service } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PaginationMeta } from '../../../common/types/pagination.type';
import { PaginationUtil } from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { SearchServiceQueryDto } from '../dto/search-service-query.dto';
import { IServiceRepository } from './interfaces/service.repository.interface';

/**
 * ServiceRepository — Prisma data access for master service definitions.
 *
 * Thread Safety: Thread-safe.
 * Soft Delete: Filters `deletedAt IS NULL`.
 * Optimistic Locking: Validates and increments `version`.
 * Uses Index: `idx_services_category_id`, `idx_services_deleted_at`.
 *
 * Architecture ref: Phase 11.0 & Phase 11.2
 */
@Injectable()
export class ServiceRepository implements IServiceRepository {
  private readonly logger = new Logger(ServiceRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<Service | null> {
    const client = tx ?? this.prisma;
    return client.service.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  public async findByCategory(categoryId: string, tx?: PrismaTransaction): Promise<Service[]> {
    const client = tx ?? this.prisma;
    return client.service.findMany({
      where: {
        categoryId,
        deletedAt: null,
      },
      orderBy: { name: 'asc' },
    });
  }

  public async findAll(tx?: PrismaTransaction): Promise<Service[]> {
    const client = tx ?? this.prisma;
    return client.service.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: { name: 'asc' },
    });
  }

  public async create(data: Prisma.ServiceUncheckedCreateInput, tx?: PrismaTransaction): Promise<Service> {
    const client = tx ?? this.prisma;
    try {
      return await client.service.create({
        data: {
          ...data,
          version: 1,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Service creation failed';
      this.logger.error(`ServiceRepository.create error: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  public async update(
    id: string,
    expectedVersion: number,
    data: Prisma.ServiceUncheckedUpdateInput,
    tx?: PrismaTransaction,
  ): Promise<Service> {
    const client = tx ?? this.prisma;
    const existing = await this.findById(id, tx);
    if (!existing) {
      throw new DatabaseException(`Service with ID ${id} not found`);
    }

    if (existing.version !== expectedVersion) {
      throw new ConflictException(
        ERROR_CODES.DATABASE.UNIQUE_VIOLATION,
        `Optimistic concurrency failure: Service ${id} has version ${existing.version}, expected ${expectedVersion}`,
      );
    }

    try {
      return await client.service.update({
        where: { id },
        data: {
          ...data,
          version: { increment: 1 },
        },
      });
    } catch (error: unknown) {
      if (error instanceof ConflictException) throw error;
      const message = error instanceof Error ? error.message : 'Service update failed';
      this.logger.error(`ServiceRepository.update error: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  public async softDelete(id: string, expectedVersion: number, tx?: PrismaTransaction): Promise<void> {
    await this.update(id, expectedVersion, { deletedAt: new Date() }, tx);
  }

  public async search(
    query: SearchServiceQueryDto,
    tx?: PrismaTransaction,
  ): Promise<{ data: Service[]; meta: PaginationMeta }> {
    const client = tx ?? this.prisma;
    const normParams = PaginationUtil.normalizeParams(query.page, query.limit);
    const { skip, take } = PaginationUtil.getSkipTake(normParams);

    const where: Prisma.ServiceWhereInput = {
      deletedAt: null,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.genderCategory ? { genderCategory: query.genderCategory } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const sortOrder = query.sortDir?.toUpperCase() === 'ASC' ? 'asc' : 'desc';
    const orderBy: Prisma.ServiceOrderByWithRelationInput = query.sortBy === 'name' ? { name: sortOrder } : { createdAt: sortOrder };

    const [items, totalItems] = await Promise.all([
      client.service.findMany({
        where,
        skip,
        take,
        orderBy,
      }),
      client.service.count({ where }),
    ]);

    const meta = PaginationUtil.buildMeta(totalItems, normParams);
    return { data: items, meta };
  }
}
