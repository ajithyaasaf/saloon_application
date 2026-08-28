import { Payment, PaymentStatus, Prisma } from '@prisma/client';
import { PaginationMeta } from '../../../../common/types/pagination.type';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';
import { SearchPaymentQueryDto } from '../../dto/search-payment-query.dto';

export interface IPaymentRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<Payment | null>;
  findByPaymentCode(code: string, tx?: PrismaTransaction): Promise<Payment | null>;
  findByBooking(bookingId: string, tx?: PrismaTransaction): Promise<Payment | null>;
  findByCustomer(customerId: string, query?: SearchPaymentQueryDto, tx?: PrismaTransaction): Promise<{ data: Payment[]; meta: PaginationMeta }>;
  findBySalon(salonId: string, query?: SearchPaymentQueryDto, tx?: PrismaTransaction): Promise<{ data: Payment[]; meta: PaginationMeta }>;
  findByBranch(branchId: string, query?: SearchPaymentQueryDto, tx?: PrismaTransaction): Promise<{ data: Payment[]; meta: PaginationMeta }>;
  findByStatus(status: PaymentStatus, query?: SearchPaymentQueryDto, tx?: PrismaTransaction): Promise<{ data: Payment[]; meta: PaginationMeta }>;
  findByIdempotencyKey(key: string, tx?: PrismaTransaction): Promise<Payment | null>;
  search(query?: SearchPaymentQueryDto, tx?: PrismaTransaction): Promise<{ data: Payment[]; meta: PaginationMeta }>;
  count(where?: Prisma.PaymentWhereInput, tx?: PrismaTransaction): Promise<number>;
  create(data: Prisma.PaymentUncheckedCreateInput, tx?: PrismaTransaction): Promise<Payment>;
  update(id: string, expectedVersion: number, data: Prisma.PaymentUncheckedUpdateInput, tx?: PrismaTransaction): Promise<Payment>;
  softDelete(id: string, expectedVersion: number, tx?: PrismaTransaction): Promise<Payment>;
}
