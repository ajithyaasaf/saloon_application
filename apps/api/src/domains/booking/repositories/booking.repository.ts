import { Injectable, Logger } from '@nestjs/common';
import { Booking, BookingStatus, Prisma } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PaginationMeta } from '../../../common/types/pagination.type';
import { PaginationUtil } from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { SearchBookingQueryDto } from '../dto/search-booking-query.dto';
import { IBookingRepository } from './interfaces/booking.repository.interface';

/**
 * BookingRepository — Prisma data access for Booking aggregate root.
 *
 * Soft Delete: Filters `deletedAt IS NULL`.
 * Optimistic Locking: Validates and increments `version`.
 * Uses Indexes: `uq_bookings_code`, `uq_bookings_salon_sequence`, `idx_bookings_salon_date`, `idx_bookings_branch_date`,
 *               `idx_bookings_branch_date_status`, `idx_bookings_customer_date`, `idx_bookings_status_date`, `idx_bookings_payment_status`.
 *
 * Architecture ref: Phase 13.0 & Phase 13.2
 */
@Injectable()
export class BookingRepository implements IBookingRepository {
  private readonly logger = new Logger(BookingRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<Booking | null> {
    const client = tx ?? this.prisma;
    return client.booking.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        items: {
          where: { deletedAt: null },
          orderBy: { sequenceOrder: 'asc' },
        },
        statusHistories: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  public async findByBookingCode(bookingCode: string, tx?: PrismaTransaction): Promise<Booking | null> {
    const client = tx ?? this.prisma;
    return client.booking.findFirst({
      where: {
        bookingCode,
        deletedAt: null,
      },
      include: {
        items: {
          where: { deletedAt: null },
          orderBy: { sequenceOrder: 'asc' },
        },
      },
    });
  }

  public async findBySequenceNumber(salonId: string, sequenceNumber: bigint | number, tx?: PrismaTransaction): Promise<Booking | null> {
    const client = tx ?? this.prisma;
    const seq = typeof sequenceNumber === 'number' ? BigInt(sequenceNumber) : sequenceNumber;
    return client.booking.findFirst({
      where: {
        salonId,
        sequenceNumber: seq,
        deletedAt: null,
      },
      include: {
        items: {
          where: { deletedAt: null },
          orderBy: { sequenceOrder: 'asc' },
        },
      },
    });
  }

  public async findByCustomer(
    customerId: string,
    query?: SearchBookingQueryDto,
    tx?: PrismaTransaction,
  ): Promise<{ data: Booking[]; meta: PaginationMeta }> {
    return this.search({ ...query, customerId }, tx);
  }

  public async findBySalon(
    salonId: string,
    query?: SearchBookingQueryDto,
    tx?: PrismaTransaction,
  ): Promise<{ data: Booking[]; meta: PaginationMeta }> {
    return this.search({ ...query, salonId }, tx);
  }

  public async findByBranch(
    branchId: string,
    query?: SearchBookingQueryDto,
    tx?: PrismaTransaction,
  ): Promise<{ data: Booking[]; meta: PaginationMeta }> {
    return this.search({ ...query, branchId }, tx);
  }

  public async findByStatus(
    status: BookingStatus,
    query?: SearchBookingQueryDto,
    tx?: PrismaTransaction,
  ): Promise<{ data: Booking[]; meta: PaginationMeta }> {
    return this.search({ ...query, status }, tx);
  }

  public async findByDate(branchId: string, date: Date | string, tx?: PrismaTransaction): Promise<Booking[]> {
    const client = tx ?? this.prisma;
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    return client.booking.findMany({
      where: {
        branchId,
        bookingDate: targetDate,
        deletedAt: null,
      },
      include: {
        items: {
          where: { deletedAt: null },
          orderBy: { sequenceOrder: 'asc' },
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  public async count(where?: Prisma.BookingWhereInput, tx?: PrismaTransaction): Promise<number> {
    const client = tx ?? this.prisma;
    return client.booking.count({
      where: {
        ...where,
        deletedAt: null,
      },
    });
  }

  public async create(data: Prisma.BookingUncheckedCreateInput, tx?: PrismaTransaction): Promise<Booking> {
    const client = tx ?? this.prisma;
    try {
      return await client.booking.create({
        data: {
          ...data,
          version: 1,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Booking creation failed';
      this.logger.error(`BookingRepository.create error: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  public async update(
    id: string,
    expectedVersion: number,
    data: Prisma.BookingUncheckedUpdateInput,
    tx?: PrismaTransaction,
  ): Promise<Booking> {
    const client = tx ?? this.prisma;
    const existing = await this.findById(id, tx);
    if (!existing) {
      throw new DatabaseException(`Booking with ID ${id} not found`);
    }

    if (existing.version !== expectedVersion) {
      throw new ConflictException(
        ERROR_CODES.DATABASE.UNIQUE_VIOLATION,
        `Optimistic concurrency failure: Booking ${id} has version ${existing.version}, expected ${expectedVersion}`,
      );
    }

    try {
      return await client.booking.update({
        where: { id },
        data: {
          ...data,
          version: { increment: 1 },
        },
      });
    } catch (error: unknown) {
      if (error instanceof ConflictException) throw error;
      const message = error instanceof Error ? error.message : 'Booking update failed';
      this.logger.error(`BookingRepository.update error: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  public async softDelete(
    id: string,
    expectedVersion: number,
    cancelledByUserId?: string,
    tx?: PrismaTransaction,
  ): Promise<void> {
    await this.update(
      id,
      expectedVersion,
      {
        deletedAt: new Date(),
        status: BookingStatus.CANCELLED,
        ...(cancelledByUserId ? { cancelledByUserId, cancelledAt: new Date() } : {}),
      },
      tx,
    );
  }

  public async search(
    query: SearchBookingQueryDto,
    tx?: PrismaTransaction,
  ): Promise<{ data: Booking[]; meta: PaginationMeta }> {
    const client = tx ?? this.prisma;
    const normParams = PaginationUtil.normalizeParams(query.page, query.limit);
    const { skip, take } = PaginationUtil.getSkipTake(normParams);

    const where: Prisma.BookingWhereInput = {
      deletedAt: null,
      ...(query.salonId ? { salonId: query.salonId } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
      ...(query.walkInType ? { walkInType: query.walkInType } : {}),
      ...(query.bookingCode ? { bookingCode: query.bookingCode } : {}),
      ...(query.bookingDate ? { bookingDate: new Date(query.bookingDate) } : {}),
      ...(query.search
        ? {
            OR: [
              { bookingCode: { contains: query.search, mode: 'insensitive' } },
              { notes: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const dir = (query.sortDirection || query.sortDir || 'DESC').toUpperCase() === 'ASC' ? 'asc' : 'desc';
    const sortByField = query.sortBy || 'createdAt';
    const orderBy: Prisma.BookingOrderByWithRelationInput = { [sortByField]: dir };

    const [items, totalItems] = await Promise.all([
      client.booking.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          items: {
            where: { deletedAt: null },
            orderBy: { sequenceOrder: 'asc' },
          },
        },
      }),
      client.booking.count({ where }),
    ]);

    const meta = PaginationUtil.buildMeta(totalItems, normParams);
    return { data: items, meta };
  }
}
