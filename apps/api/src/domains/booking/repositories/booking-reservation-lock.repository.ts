import { Injectable, Logger } from '@nestjs/common';
import { BookingReservationLock, Prisma } from '@prisma/client';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { IBookingReservationLockRepository } from './interfaces/booking-reservation-lock.repository.interface';

/**
 * BookingReservationLockRepository — Data access for ephemeral slot reservation locks.
 *
 * Uses Indexes: `uq_booking_reservation_locks_key`, `idx_booking_reservation_locks_branch_staff`,
 *               `idx_booking_reservation_locks_expires_at`, `idx_booking_reservation_locks_released_expires`.
 *
 * Architecture ref: Phase 13.0 & Phase 13.2
 */
@Injectable()
export class BookingReservationLockRepository implements IBookingReservationLockRepository {
  private readonly logger = new Logger(BookingReservationLockRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<BookingReservationLock | null> {
    const client = tx ?? this.prisma;
    return client.bookingReservationLock.findUnique({
      where: { id },
    });
  }

  public async findByLockKey(lockKey: string, tx?: PrismaTransaction): Promise<BookingReservationLock | null> {
    const client = tx ?? this.prisma;
    return client.bookingReservationLock.findUnique({
      where: { lockKey },
    });
  }

  public async findByBooking(bookingId: string, tx?: PrismaTransaction): Promise<BookingReservationLock[]> {
    const client = tx ?? this.prisma;
    return client.bookingReservationLock.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findByCustomer(customerId: string, tx?: PrismaTransaction): Promise<BookingReservationLock[]> {
    const client = tx ?? this.prisma;
    return client.bookingReservationLock.findMany({
      where: { customerId, isReleased: false },
      orderBy: { expiresAt: 'desc' },
    });
  }

  public async findExpired(now: Date = new Date(), tx?: PrismaTransaction): Promise<BookingReservationLock[]> {
    const client = tx ?? this.prisma;
    return client.bookingReservationLock.findMany({
      where: {
        isReleased: false,
        expiresAt: { lt: now },
      },
      orderBy: { expiresAt: 'asc' },
    });
  }

  public async findActive(
    branchId: string,
    staffId?: string,
    now: Date = new Date(),
    tx?: PrismaTransaction,
  ): Promise<BookingReservationLock[]> {
    const client = tx ?? this.prisma;
    return client.bookingReservationLock.findMany({
      where: {
        branchId,
        ...(staffId ? { staffId } : {}),
        isReleased: false,
        expiresAt: { gt: now },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  public async create(
    data: Prisma.BookingReservationLockUncheckedCreateInput,
    tx?: PrismaTransaction,
  ): Promise<BookingReservationLock> {
    const client = tx ?? this.prisma;
    try {
      if (typeof client.bookingReservationLock?.upsert === 'function') {
        return await client.bookingReservationLock.upsert({
          where: { lockKey: data.lockKey },
          create: data,
          update: {
            ...data,
            refreshCount: 0,
            isReleased: false,
          },
        });
      }
      return await client.bookingReservationLock.create({
        data,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'BookingReservationLock creation failed';
      this.logger.error(`BookingReservationLockRepository.create error: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  public async update(
    id: string,
    data: Prisma.BookingReservationLockUncheckedUpdateInput,
    tx?: PrismaTransaction,
  ): Promise<BookingReservationLock> {
    const client = tx ?? this.prisma;
    try {
      return await client.bookingReservationLock.update({
        where: { id },
        data,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'BookingReservationLock update failed';
      this.logger.error(`BookingReservationLockRepository.update error: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  public async delete(id: string, tx?: PrismaTransaction): Promise<void> {
    const client = tx ?? this.prisma;
    await client.bookingReservationLock.delete({
      where: { id },
    });
  }

  public async release(lockKey: string, tx?: PrismaTransaction): Promise<void> {
    const client = tx ?? this.prisma;
    await client.bookingReservationLock.updateMany({
      where: { lockKey },
      data: { isReleased: true },
    });
  }
}
