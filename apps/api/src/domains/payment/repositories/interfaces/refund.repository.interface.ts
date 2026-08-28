import { Prisma, Refund, RefundStatus } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';

export interface IRefundRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<Refund | null>;
  findByRefundCode(code: string, tx?: PrismaTransaction): Promise<Refund | null>;
  findByPayment(paymentId: string, tx?: PrismaTransaction): Promise<Refund[]>;
  findByBooking(bookingId: string, tx?: PrismaTransaction): Promise<Refund[]>;
  findByStatus(status: RefundStatus, tx?: PrismaTransaction): Promise<Refund[]>;
  create(data: Prisma.RefundUncheckedCreateInput, tx?: PrismaTransaction): Promise<Refund>;
  update(id: string, expectedVersion: number, data: Prisma.RefundUncheckedUpdateInput, tx?: PrismaTransaction): Promise<Refund>;
  softDelete(id: string, expectedVersion: number, tx?: PrismaTransaction): Promise<Refund>;
}
