import { Injectable, Logger } from '@nestjs/common';
import { Prisma, ServiceCategory } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { IServiceCategoryRepository } from './interfaces/service-category.repository.interface';

/**
 * ServiceCategoryRepository — Prisma data access for master service categories.
 *
 * Thread Safety: Thread-safe.
 * Soft Delete: Filters `deletedAt IS NULL`.
 * Optimistic Locking: Validates and increments `version`.
 *
 * Architecture ref: Phase 11.0 & Phase 11.2
 */
@Injectable()
export class ServiceCategoryRepository implements IServiceCategoryRepository {
  private readonly logger = new Logger(ServiceCategoryRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<ServiceCategory | null> {
    const client = tx ?? this.prisma;
    return client.serviceCategory.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  public async findByName(name: string, tx?: PrismaTransaction): Promise<ServiceCategory | null> {
    const client = tx ?? this.prisma;
    return client.serviceCategory.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        deletedAt: null,
      },
    });
  }

  public async findAll(tx?: PrismaTransaction): Promise<ServiceCategory[]> {
    const client = tx ?? this.prisma;
    return client.serviceCategory.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: { displayOrder: 'asc' },
    });
  }

  public async create(
    data: Prisma.ServiceCategoryUncheckedCreateInput,
    tx?: PrismaTransaction,
  ): Promise<ServiceCategory> {
    const client = tx ?? this.prisma;
    try {
      return await client.serviceCategory.create({
        data: {
          ...data,
          version: 1,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Service category creation failed';
      this.logger.error(`ServiceCategoryRepository.create error: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  public async update(
    id: string,
    expectedVersion: number,
    data: Prisma.ServiceCategoryUncheckedUpdateInput,
    tx?: PrismaTransaction,
  ): Promise<ServiceCategory> {
    const client = tx ?? this.prisma;
    const existing = await this.findById(id, tx);
    if (!existing) {
      throw new DatabaseException(`ServiceCategory with ID ${id} not found`);
    }

    if (existing.version !== expectedVersion) {
      throw new ConflictException(
        ERROR_CODES.DATABASE.UNIQUE_VIOLATION,
        `Optimistic concurrency failure: ServiceCategory ${id} has version ${existing.version}, expected ${expectedVersion}`,
      );
    }

    try {
      return await client.serviceCategory.update({
        where: { id },
        data: {
          ...data,
          version: { increment: 1 },
        },
      });
    } catch (error: unknown) {
      if (error instanceof ConflictException) throw error;
      const message = error instanceof Error ? error.message : 'Service category update failed';
      this.logger.error(`ServiceCategoryRepository.update error: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  public async softDelete(id: string, expectedVersion: number, tx?: PrismaTransaction): Promise<void> {
    await this.update(id, expectedVersion, { deletedAt: new Date() }, tx);
  }
}
