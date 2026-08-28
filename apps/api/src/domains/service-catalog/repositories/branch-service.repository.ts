import { Injectable, Logger } from '@nestjs/common';
import { BranchService, Prisma, ServiceStatus } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { IBranchServiceRepository } from './interfaces/branch-service.repository.interface';

/**
 * BranchServiceRepository — Prisma data access for branch service offerings and prices.
 *
 * Thread Safety: Thread-safe.
 * Soft Delete: Filters `deletedAt IS NULL`.
 * Optimistic Locking: Validates and increments `version`.
 * Uses Indexes:
 *  - `idx_branch_services_lookup` (branchId, serviceId)
 *  - `idx_branch_services_status` (branchId, isActive, status)
 *  - `idx_branch_services_branch_status` (branchId, status)
 *  - `idx_branch_services_service_id` (serviceId)
 *  - `idx_branch_services_status_deleted` (status, deletedAt)
 *
 * Architecture ref: Phase 11.0 & Phase 11.2
 */
@Injectable()
export class BranchServiceRepository implements IBranchServiceRepository {
  private readonly logger = new Logger(BranchServiceRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<BranchService | null> {
    const client = tx ?? this.prisma;
    return client.branchService.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  public async findByBranch(branchId: string, tx?: PrismaTransaction): Promise<BranchService[]> {
    const client = tx ?? this.prisma;
    return client.branchService.findMany({
      where: {
        branchId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findByService(serviceId: string, tx?: PrismaTransaction): Promise<BranchService[]> {
    const client = tx ?? this.prisma;
    return client.branchService.findMany({
      where: {
        serviceId,
        deletedAt: null,
      },
    });
  }

  public async findBranchService(branchId: string, serviceId: string, tx?: PrismaTransaction): Promise<BranchService | null> {
    const client = tx ?? this.prisma;
    return client.branchService.findFirst({
      where: {
        branchId,
        serviceId,
        deletedAt: null,
      },
    });
  }

  public async create(data: Prisma.BranchServiceUncheckedCreateInput, tx?: PrismaTransaction): Promise<BranchService> {
    const client = tx ?? this.prisma;
    try {
      return await client.branchService.create({
        data: {
          ...data,
          version: 1,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'BranchService creation failed';
      this.logger.error(`BranchServiceRepository.create error: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  public async update(
    id: string,
    expectedVersion: number,
    data: Prisma.BranchServiceUncheckedUpdateInput,
    tx?: PrismaTransaction,
  ): Promise<BranchService> {
    const client = tx ?? this.prisma;
    const existing = await this.findById(id, tx);
    if (!existing) {
      throw new DatabaseException(`BranchService with ID ${id} not found`);
    }

    if (existing.version !== expectedVersion) {
      throw new ConflictException(
        ERROR_CODES.DATABASE.UNIQUE_VIOLATION,
        `Optimistic concurrency failure: BranchService ${id} has version ${existing.version}, expected ${expectedVersion}`,
      );
    }

    try {
      return await client.branchService.update({
        where: { id },
        data: {
          ...data,
          version: { increment: 1 },
        },
      });
    } catch (error: unknown) {
      if (error instanceof ConflictException) throw error;
      const message = error instanceof Error ? error.message : 'BranchService update failed';
      this.logger.error(`BranchServiceRepository.update error: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  public async softDelete(id: string, expectedVersion: number, tx?: PrismaTransaction): Promise<void> {
    await this.update(
      id,
      expectedVersion,
      {
        deletedAt: new Date(),
        status: ServiceStatus.ARCHIVED,
        isActive: false,
      },
      tx,
    );
  }

  public async updatePrice(
    id: string,
    expectedVersion: number,
    newPrice: number,
    tx?: PrismaTransaction,
  ): Promise<BranchService> {
    return this.update(id, expectedVersion, { price: newPrice }, tx);
  }

  public async listActive(branchId: string, tx?: PrismaTransaction): Promise<BranchService[]> {
    const client = tx ?? this.prisma;
    return client.branchService.findMany({
      where: {
        branchId,
        isActive: true,
        status: ServiceStatus.ACTIVE,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
