import { Injectable, Logger } from '@nestjs/common';
import { BookingItem, Prisma } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { IBookingItemRepository } from './interfaces/booking-item.repository.interface';

/**
 * BookingItemRepository — Data access for BookingItem child entities.
 *
 * Uses Indexes: `idx_booking_items_booking`, `idx_booking_items_staff`,
 *               `idx_booking_items_branch_service`, `idx_booking_items_staff_time_range`.
 *
 * Architecture ref: Phase 13.0 & Phase 13.2
 */
@Injectable()
export class BookingItemRepository implements IBookingItemRepository {
  private readonly logger = new Logger(BookingItemRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<BookingItem | null> {
    const client = tx ?? this.prisma;
    return client.bookingItem.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  public async findByBooking(bookingId: string, tx?: PrismaTransaction): Promise<BookingItem[]> {
    const client = tx ?? this.prisma;
    return client.bookingItem.findMany({
      where: {
        bookingId,
        deletedAt: null,
      },
      orderBy: { sequenceOrder: 'asc' },
    });
  }

  public async findByStaff(
    staffId: string,
    startTime?: Date,
    endTime?: Date,
    tx?: PrismaTransaction,
  ): Promise<BookingItem[]> {
    const client = tx ?? this.prisma;
    return client.bookingItem.findMany({
      where: {
        staffId,
        deletedAt: null,
        ...(startTime && endTime
          ? {
              startTime: { lt: endTime },
              endTime: { gt: startTime },
            }
          : {}),
      },
      orderBy: { startTime: 'asc' },
    });
  }

  public async findByBranchService(branchServiceId: string, tx?: PrismaTransaction): Promise<BookingItem[]> {
    const client = tx ?? this.prisma;
    return client.bookingItem.findMany({
      where: {
        branchServiceId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async create(data: Prisma.BookingItemUncheckedCreateInput, tx?: PrismaTransaction): Promise<BookingItem> {
    const client = tx ?? this.prisma;
    try {
      return await client.bookingItem.create({
        data: {
          ...data,
          version: 1,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'BookingItem creation failed';
      this.logger.error(`BookingItemRepository.create error: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  public async update(
    id: string,
    expectedVersion: number,
    data: Prisma.BookingItemUncheckedUpdateInput,
    tx?: PrismaTransaction,
  ): Promise<BookingItem> {
    const client = tx ?? this.prisma;
    const existing = await this.findById(id, tx);
    if (!existing) {
      throw new DatabaseException(`BookingItem with ID ${id} not found`);
    }

    if (existing.version !== expectedVersion) {
      throw new ConflictException(
        ERROR_CODES.DATABASE.UNIQUE_VIOLATION,
        `Optimistic concurrency failure: BookingItem ${id} has version ${existing.version}, expected ${expectedVersion}`,
      );
    }

    try {
      return await client.bookingItem.update({
        where: { id },
        data: {
          ...data,
          version: { increment: 1 },
        },
      });
    } catch (error: unknown) {
      if (error instanceof ConflictException) throw error;
      const message = error instanceof Error ? error.message : 'BookingItem update failed';
      this.logger.error(`BookingItemRepository.update error: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  public async softDelete(id: string, expectedVersion: number, tx?: PrismaTransaction): Promise<void> {
    await this.update(id, expectedVersion, { deletedAt: new Date() }, tx);
  }
}
