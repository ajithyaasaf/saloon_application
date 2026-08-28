import { Booking, BookingStatus, Prisma } from '@prisma/client';
import { PaginationMeta } from '../../../../common/types/pagination.type';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';
import { SearchBookingQueryDto } from '../../dto/search-booking-query.dto';

export interface IBookingRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<Booking | null>;
  findByBookingCode(bookingCode: string, tx?: PrismaTransaction): Promise<Booking | null>;
  findBySequenceNumber(salonId: string, sequenceNumber: bigint | number, tx?: PrismaTransaction): Promise<Booking | null>;
  findByCustomer(customerId: string, query?: SearchBookingQueryDto, tx?: PrismaTransaction): Promise<{ data: Booking[]; meta: PaginationMeta }>;
  findBySalon(salonId: string, query?: SearchBookingQueryDto, tx?: PrismaTransaction): Promise<{ data: Booking[]; meta: PaginationMeta }>;
  findByBranch(branchId: string, query?: SearchBookingQueryDto, tx?: PrismaTransaction): Promise<{ data: Booking[]; meta: PaginationMeta }>;
  findByStatus(status: BookingStatus, query?: SearchBookingQueryDto, tx?: PrismaTransaction): Promise<{ data: Booking[]; meta: PaginationMeta }>;
  findByDate(branchId: string, date: Date | string, tx?: PrismaTransaction): Promise<Booking[]>;
  search(query: SearchBookingQueryDto, tx?: PrismaTransaction): Promise<{ data: Booking[]; meta: PaginationMeta }>;
  create(data: Prisma.BookingUncheckedCreateInput, tx?: PrismaTransaction): Promise<Booking>;
  update(id: string, expectedVersion: number, data: Prisma.BookingUncheckedUpdateInput, tx?: PrismaTransaction): Promise<Booking>;
  softDelete(id: string, expectedVersion: number, cancelledByUserId?: string, tx?: PrismaTransaction): Promise<void>;
  count(where?: Prisma.BookingWhereInput, tx?: PrismaTransaction): Promise<number>;
}
