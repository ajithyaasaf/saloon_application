import { BookingReservationLock, Prisma } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';

export interface IBookingReservationLockRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<BookingReservationLock | null>;
  findByLockKey(lockKey: string, tx?: PrismaTransaction): Promise<BookingReservationLock | null>;
  findByBooking(bookingId: string, tx?: PrismaTransaction): Promise<BookingReservationLock[]>;
  findByCustomer(customerId: string, tx?: PrismaTransaction): Promise<BookingReservationLock[]>;
  findExpired(now?: Date, tx?: PrismaTransaction): Promise<BookingReservationLock[]>;
  findActive(branchId: string, staffId?: string, now?: Date, tx?: PrismaTransaction): Promise<BookingReservationLock[]>;
  create(data: Prisma.BookingReservationLockUncheckedCreateInput, tx?: PrismaTransaction): Promise<BookingReservationLock>;
  update(id: string, data: Prisma.BookingReservationLockUncheckedUpdateInput, tx?: PrismaTransaction): Promise<BookingReservationLock>;
  delete(id: string, tx?: PrismaTransaction): Promise<void>;
  release(lockKey: string, tx?: PrismaTransaction): Promise<void>;
}
