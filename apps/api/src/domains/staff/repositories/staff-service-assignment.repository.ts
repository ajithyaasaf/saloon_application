import { Injectable, Logger } from '@nestjs/common';
import { Prisma, StaffServiceAssignment } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { IStaffServiceAssignmentRepository } from './interfaces/staff-service-assignment.repository.interface';

/**
 * StaffServiceAssignmentRepository — Prisma data access for staff service capabilities.
 *
 * Thread Safety: Thread-safe.
 * Soft Delete: Filters `deletedAt IS NULL`.
 * Optimistic Locking: Validates and increments `version`.
 * Uses Index: `uq_staff_service_assignments`, `idx_staff_service_assignments_staff_active`.
 *
 * Architecture ref: Phase 12.0 & Phase 12.2
 */
@Injectable()
export class StaffServiceAssignmentRepository implements IStaffServiceAssignmentRepository {
  private readonly logger = new Logger(StaffServiceAssignmentRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<StaffServiceAssignment | null> {
    const client = tx ?? this.prisma;
    return client.staffServiceAssignment.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  public async findByStaff(staffId: string, tx?: PrismaTransaction): Promise<StaffServiceAssignment[]> {
    const client = tx ?? this.prisma;
    return client.staffServiceAssignment.findMany({
      where: {
        staffId,
        isActive: true,
        deletedAt: null,
      },
      orderBy: { assignedAt: 'desc' },
    });
  }

  public async findByBranchService(branchServiceId: string, tx?: PrismaTransaction): Promise<StaffServiceAssignment[]> {
    const client = tx ?? this.prisma;
    return client.staffServiceAssignment.findMany({
      where: {
        branchServiceId,
        isActive: true,
        deletedAt: null,
      },
    });
  }

  public async findAssignment(
    staffId: string,
    branchServiceId: string,
    tx?: PrismaTransaction,
  ): Promise<StaffServiceAssignment | null> {
    const client = tx ?? this.prisma;
    return client.staffServiceAssignment.findFirst({
      where: {
        staffId,
        branchServiceId,
        deletedAt: null,
      },
    });
  }

  public async create(
    data: Prisma.StaffServiceAssignmentUncheckedCreateInput,
    tx?: PrismaTransaction,
  ): Promise<StaffServiceAssignment> {
    const client = tx ?? this.prisma;
    try {
      return await client.staffServiceAssignment.create({
        data: {
          ...data,
          version: 1,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Service capability assignment failed';
      this.logger.error(`StaffServiceAssignmentRepository.create error: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  public async update(
    id: string,
    expectedVersion: number,
    data: Prisma.StaffServiceAssignmentUncheckedUpdateInput,
    tx?: PrismaTransaction,
  ): Promise<StaffServiceAssignment> {
    const client = tx ?? this.prisma;
    const existing = await this.findById(id, tx);
    if (!existing) {
      throw new DatabaseException(`StaffServiceAssignment with ID ${id} not found`);
    }

    if (existing.version !== expectedVersion) {
      throw new ConflictException(
        ERROR_CODES.DATABASE.UNIQUE_VIOLATION,
        `Optimistic concurrency failure: StaffServiceAssignment ${id} has version ${existing.version}, expected ${expectedVersion}`,
      );
    }

    try {
      return await client.staffServiceAssignment.update({
        where: { id },
        data: {
          ...data,
          version: { increment: 1 },
        },
      });
    } catch (error: unknown) {
      if (error instanceof ConflictException) throw error;
      const message = error instanceof Error ? error.message : 'Service capability assignment update failed';
      this.logger.error(`StaffServiceAssignmentRepository.update error: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  public async softDelete(id: string, expectedVersion: number, tx?: PrismaTransaction): Promise<void> {
    await this.update(id, expectedVersion, { deletedAt: new Date(), isActive: false }, tx);
  }
}
