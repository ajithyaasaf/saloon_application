import { Injectable, Logger } from '@nestjs/common';
import { Prisma, StaffWorkingHours } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { IStaffWorkingHoursRepository } from './interfaces/staff-working-hours.repository.interface';

/**
 * StaffWorkingHoursRepository — Prisma data access for staff working hours & schedules.
 *
 * Thread Safety: Thread-safe.
 * Soft Delete: Filters `deletedAt IS NULL`.
 * Optimistic Locking: Validates and increments `version`.
 * Uses Index: `idx_staff_working_hours_lookup`.
 *
 * Architecture ref: Phase 12.0 & Phase 12.2
 */
@Injectable()
export class StaffWorkingHoursRepository implements IStaffWorkingHoursRepository {
  private readonly logger = new Logger(StaffWorkingHoursRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<StaffWorkingHours | null> {
    const client = tx ?? this.prisma;
    return client.staffWorkingHours.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  public async findHours(staffId: string, branchId?: string, tx?: PrismaTransaction): Promise<StaffWorkingHours[]> {
    const client = tx ?? this.prisma;
    return client.staffWorkingHours.findMany({
      where: {
        staffId,
        ...(branchId ? { branchId } : {}),
        isActive: true,
        deletedAt: null,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { effectiveFrom: 'desc' }],
    });
  }

  public async findEffectiveOnDate(
    staffId: string,
    branchId: string,
    date: Date,
    tx?: PrismaTransaction,
  ): Promise<StaffWorkingHours[]> {
    const client = tx ?? this.prisma;
    const targetDate = new Date(date);
    return client.staffWorkingHours.findMany({
      where: {
        staffId,
        branchId,
        isActive: true,
        deletedAt: null,
        effectiveFrom: {
          lte: targetDate,
        },
        OR: [
          { effectiveUntil: null },
          { effectiveUntil: { gte: targetDate } },
        ],
      },
    });
  }

  public async upsertHours(
    data: Prisma.StaffWorkingHoursUncheckedCreateInput,
    tx?: PrismaTransaction,
  ): Promise<StaffWorkingHours> {
    const client = tx ?? this.prisma;
    try {
      return await client.staffWorkingHours.create({
        data: {
          ...data,
          version: 1,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Working hours upsert failed';
      this.logger.error(`StaffWorkingHoursRepository.upsertHours error: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  public async update(
    id: string,
    expectedVersion: number,
    data: Prisma.StaffWorkingHoursUncheckedUpdateInput,
    tx?: PrismaTransaction,
  ): Promise<StaffWorkingHours> {
    const client = tx ?? this.prisma;
    const existing = await this.findById(id, tx);
    if (!existing) {
      throw new DatabaseException(`StaffWorkingHours with ID ${id} not found`);
    }

    if (existing.version !== expectedVersion) {
      throw new ConflictException(
        ERROR_CODES.DATABASE.UNIQUE_VIOLATION,
        `Optimistic concurrency failure: StaffWorkingHours ${id} has version ${existing.version}, expected ${expectedVersion}`,
      );
    }

    try {
      return await client.staffWorkingHours.update({
        where: { id },
        data: {
          ...data,
          version: { increment: 1 },
        },
      });
    } catch (error: unknown) {
      if (error instanceof ConflictException) throw error;
      const message = error instanceof Error ? error.message : 'Working hours update failed';
      this.logger.error(`StaffWorkingHoursRepository.update error: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  public async deleteHours(id: string, expectedVersion: number, tx?: PrismaTransaction): Promise<void> {
    await this.update(id, expectedVersion, { deletedAt: new Date(), isActive: false }, tx);
  }
}
