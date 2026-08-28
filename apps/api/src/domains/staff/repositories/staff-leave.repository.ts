import { Injectable, Logger } from '@nestjs/common';
import { LeaveStatus, Prisma, StaffLeave } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { IStaffLeaveRepository } from './interfaces/staff-leave.repository.interface';

/**
 * StaffLeaveRepository — Prisma data access for staff leave requests and approvals.
 *
 * Thread Safety: Thread-safe.
 * Soft Delete: Filters `deletedAt IS NULL`.
 * Optimistic Locking: Validates and increments `version`.
 * Uses Index: `idx_staff_leaves_lookup`.
 *
 * Architecture ref: Phase 12.0 & Phase 12.2
 */
@Injectable()
export class StaffLeaveRepository implements IStaffLeaveRepository {
  private readonly logger = new Logger(StaffLeaveRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<StaffLeave | null> {
    const client = tx ?? this.prisma;
    return client.staffLeave.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  public async create(data: Prisma.StaffLeaveUncheckedCreateInput, tx?: PrismaTransaction): Promise<StaffLeave> {
    const client = tx ?? this.prisma;
    try {
      return await client.staffLeave.create({
        data: {
          ...data,
          version: 1,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Staff leave creation failed';
      this.logger.error(`StaffLeaveRepository.create error: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  public async update(
    id: string,
    expectedVersion: number,
    data: Prisma.StaffLeaveUncheckedUpdateInput,
    tx?: PrismaTransaction,
  ): Promise<StaffLeave> {
    const client = tx ?? this.prisma;
    const existing = await this.findById(id, tx);
    if (!existing) {
      throw new DatabaseException(`StaffLeave with ID ${id} not found`);
    }

    if (existing.version !== expectedVersion) {
      throw new ConflictException(
        ERROR_CODES.DATABASE.UNIQUE_VIOLATION,
        `Optimistic concurrency failure: StaffLeave ${id} has version ${existing.version}, expected ${expectedVersion}`,
      );
    }

    try {
      return await client.staffLeave.update({
        where: { id },
        data: {
          ...data,
          version: { increment: 1 },
        },
      });
    } catch (error: unknown) {
      if (error instanceof ConflictException) throw error;
      const message = error instanceof Error ? error.message : 'Staff leave update failed';
      this.logger.error(`StaffLeaveRepository.update error: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  public async findByStaff(staffId: string, tx?: PrismaTransaction): Promise<StaffLeave[]> {
    const client = tx ?? this.prisma;
    return client.staffLeave.findMany({
      where: {
        staffId,
        deletedAt: null,
      },
      orderBy: { startDate: 'desc' },
    });
  }

  public async findPending(staffId?: string, tx?: PrismaTransaction): Promise<StaffLeave[]> {
    const client = tx ?? this.prisma;
    return client.staffLeave.findMany({
      where: {
        ...(staffId ? { staffId } : {}),
        status: LeaveStatus.PENDING,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  public async findApproved(
    staffId: string,
    startDate?: Date,
    endDate?: Date,
    tx?: PrismaTransaction,
  ): Promise<StaffLeave[]> {
    const client = tx ?? this.prisma;
    return client.staffLeave.findMany({
      where: {
        staffId,
        status: LeaveStatus.APPROVED,
        deletedAt: null,
        ...(startDate && endDate
          ? {
              OR: [
                {
                  startDate: { lte: endDate },
                  endDate: { gte: startDate },
                },
              ],
            }
          : {}),
      },
      orderBy: { startDate: 'asc' },
    });
  }

  public async softDelete(id: string, expectedVersion: number, tx?: PrismaTransaction): Promise<void> {
    await this.update(id, expectedVersion, { deletedAt: new Date(), status: LeaveStatus.CANCELLED }, tx);
  }
}
