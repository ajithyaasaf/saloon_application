import { Injectable, Logger } from '@nestjs/common';
import { BookingStatusHistory, Prisma } from '@prisma/client';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { IBookingStatusHistoryRepository } from './interfaces/booking-status-history.repository.interface';

/**
 * BookingStatusHistoryRepository — Data access for immutable BookingStatusHistory logs.
 *
 * Uses Indexes: `idx_booking_status_histories_booking`, `idx_booking_status_histories_booking_created`.
 *
 * Architecture ref: Phase 13.0 & Phase 13.2
 */
@Injectable()
export class BookingStatusHistoryRepository implements IBookingStatusHistoryRepository {
  private readonly logger = new Logger(BookingStatusHistoryRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findByBooking(bookingId: string, tx?: PrismaTransaction): Promise<BookingStatusHistory[]> {
    const client = tx ?? this.prisma;
    return client.bookingStatusHistory.findMany({
      where: {
        bookingId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async create(
    data: Prisma.BookingStatusHistoryUncheckedCreateInput,
    tx?: PrismaTransaction,
  ): Promise<BookingStatusHistory> {
    const client = tx ?? this.prisma;
    try {
      return await client.bookingStatusHistory.create({
        data,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'BookingStatusHistory creation failed';
      this.logger.error(`BookingStatusHistoryRepository.create error: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }
}
