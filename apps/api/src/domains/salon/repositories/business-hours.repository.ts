import { Injectable, Logger } from '@nestjs/common';
import { BranchBusinessHours, BranchSpecialHoliday, BranchTempClosure, Prisma } from '@prisma/client';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { IBusinessHoursRepository } from './interfaces/business-hours.repository.interface';

/**
 * BusinessHoursRepository — Data access implementation for Branch business hours and holidays.
 *
 * Thread Safety: 100% Thread-Safe.
 * Composite Keys: `[branchId, dayOfWeek]`
 *
 * Architecture ref: Phase 10.0 & Phase 10.2
 */
@Injectable()
export class BusinessHoursRepository implements IBusinessHoursRepository {
  private readonly logger = new Logger(BusinessHoursRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findHoursByBranchId(branchId: string, tx?: PrismaTransaction): Promise<BranchBusinessHours[]> {
    const client = tx ?? this.prisma;
    return client.branchBusinessHours.findMany({
      where: { branchId },
    });
  }

  public async upsertHours(
    branchId: string,
    hours: Prisma.BranchBusinessHoursUncheckedCreateInput[],
    tx?: PrismaTransaction,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    try {
      await client.branchBusinessHours.deleteMany({
        where: { branchId },
      });

      await client.branchBusinessHours.createMany({
        data: hours.map((h) => ({ ...h, branchId })),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Working hours update failed';
      this.logger.error(`BusinessHoursRepository.upsertHours error: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  public async addSpecialHoliday(
    data: Prisma.BranchSpecialHolidayUncheckedCreateInput,
    tx?: PrismaTransaction,
  ): Promise<BranchSpecialHoliday> {
    const client = tx ?? this.prisma;
    try {
      return await client.branchSpecialHoliday.create({
        data,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Holiday creation failed';
      this.logger.error(`BusinessHoursRepository.addSpecialHoliday error: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  public async findHolidaysByBranchId(branchId: string, date: Date, tx?: PrismaTransaction): Promise<BranchSpecialHoliday[]> {
    const client = tx ?? this.prisma;
    return client.branchSpecialHoliday.findMany({
      where: {
        branchId,
        holidayDate: date,
      },
    });
  }

  public async addTempClosure(
    data: Prisma.BranchTempClosureUncheckedCreateInput,
    tx?: PrismaTransaction,
  ): Promise<BranchTempClosure> {
    const client = tx ?? this.prisma;
    try {
      return await client.branchTempClosure.create({
        data,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Temp closure creation failed';
      this.logger.error(`BusinessHoursRepository.addTempClosure error: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  public async findActiveTempClosures(branchId: string, atTime: Date, tx?: PrismaTransaction): Promise<BranchTempClosure[]> {
    const client = tx ?? this.prisma;
    return client.branchTempClosure.findMany({
      where: {
        branchId,
        startTime: { lte: atTime },
        endTime: { gte: atTime },
      },
    });
  }
}
