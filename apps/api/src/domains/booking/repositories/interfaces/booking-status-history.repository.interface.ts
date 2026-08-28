import { BookingStatusHistory, Prisma } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';

export interface IBookingStatusHistoryRepository {
  findByBooking(bookingId: string, tx?: PrismaTransaction): Promise<BookingStatusHistory[]>;
  create(data: Prisma.BookingStatusHistoryUncheckedCreateInput, tx?: PrismaTransaction): Promise<BookingStatusHistory>;
}
