import { BookingItem, Prisma } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';

export interface IBookingItemRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<BookingItem | null>;
  findByBooking(bookingId: string, tx?: PrismaTransaction): Promise<BookingItem[]>;
  findByStaff(staffId: string, startTime?: Date, endTime?: Date, tx?: PrismaTransaction): Promise<BookingItem[]>;
  findByBranchService(branchServiceId: string, tx?: PrismaTransaction): Promise<BookingItem[]>;
  create(data: Prisma.BookingItemUncheckedCreateInput, tx?: PrismaTransaction): Promise<BookingItem>;
  update(id: string, expectedVersion: number, data: Prisma.BookingItemUncheckedUpdateInput, tx?: PrismaTransaction): Promise<BookingItem>;
  softDelete(id: string, expectedVersion: number, tx?: PrismaTransaction): Promise<void>;
}
