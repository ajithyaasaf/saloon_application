import { Injectable, Logger } from '@nestjs/common';
import { Prisma, StaffBranchAssignment } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { IStaffBranchAssignmentRepository } from './interfaces/staff-branch-assignment.repository.interface';

/**
 * StaffBranchAssignmentRepository — Prisma data access for staff branch assignments.
 *
 * Thread Safety: Thread-safe.
 * Soft Delete: Filters `deletedAt IS NULL`.
 * Optimistic Locking: Validates and increments `version`.
 * Uses Index: `idx_staff_branch_assignments_staff_active`, `idx_staff_branch_assignments_branch_active`.
 *
 * Architecture ref: Phase 12.0 & Phase 12.2
 */
@Injectable()
export class StaffBranchAssignmentRepository implements IStaffBranchAssignmentRepository {
  private readonly logger = new Logger(StaffBranchAssignmentRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<StaffBranchAssignment | null> {
    const client = tx ?? this.prisma;
    return client.staffBranchAssignment.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  public async findAssignments(staffId: string, tx?: PrismaTransaction): Promise<StaffBranchAssignment[]> {
    const client = tx ?? this.prisma;
    return client.staffBranchAssignment.findMany({
      where: {
        staffId,
        isActive: true,
        deletedAt: null,
      },
      orderBy: { isPrimary: 'desc' },
    });
  }

  public async findPrimaryBranch(staffId: string, tx?: PrismaTransaction): Promise<StaffBranchAssignment | null> {
    const client = tx ?? this.prisma;
    return client.staffBranchAssignment.findFirst({
      where: {
        staffId,
        isPrimary: true,
        isActive: true,
        deletedAt: null,
      },
    });
  }

  public async findByBranch(branchId: string, tx?: PrismaTransaction): Promise<StaffBranchAssignment[]> {
    const client = tx ?? this.prisma;
    return client.staffBranchAssignment.findMany({
      where: {
        branchId,
        isActive: true,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async create(
    data: Prisma.StaffBranchAssignmentUncheckedCreateInput,
    tx?: PrismaTransaction,
  ): Promise<StaffBranchAssignment> {
    const client = tx ?? this.prisma;
    try {
      return await client.staffBranchAssignment.create({
        data: {
          ...data,
          version: 1,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Branch assignment creation failed';
      this.logger.error(`StaffBranchAssignmentRepository.create error: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  public async update(
    id: string,
    expectedVersion: number,
    data: Prisma.StaffBranchAssignmentUncheckedUpdateInput,
    tx?: PrismaTransaction,
  ): Promise<StaffBranchAssignment> {
    const client = tx ?? this.prisma;
    const existing = await this.findById(id, tx);
    if (!existing) {
      throw new DatabaseException(`StaffBranchAssignment with ID ${id} not found`);
    }

    if (existing.version !== expectedVersion) {
      throw new ConflictException(
        ERROR_CODES.DATABASE.UNIQUE_VIOLATION,
        `Optimistic concurrency failure: StaffBranchAssignment ${id} has version ${existing.version}, expected ${expectedVersion}`,
      );
    }

    try {
      return await client.staffBranchAssignment.update({
        where: { id },
        data: {
          ...data,
          version: { increment: 1 },
        },
      });
    } catch (error: unknown) {
      if (error instanceof ConflictException) throw error;
      const message = error instanceof Error ? error.message : 'Branch assignment update failed';
      this.logger.error(`StaffBranchAssignmentRepository.update error: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  public async softDelete(id: string, expectedVersion: number, tx?: PrismaTransaction): Promise<void> {
    await this.update(id, expectedVersion, { deletedAt: new Date(), isActive: false }, tx);
  }
}
