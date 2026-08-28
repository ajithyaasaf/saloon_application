import { Invoice, Prisma } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';

export interface IInvoiceRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<Invoice | null>;
  findByInvoiceNumber(invoiceNumber: string, tx?: PrismaTransaction): Promise<Invoice | null>;
  findByPayment(paymentId: string, tx?: PrismaTransaction): Promise<Invoice | null>;
  findByBooking(bookingId: string, tx?: PrismaTransaction): Promise<Invoice | null>;
  create(data: Prisma.InvoiceUncheckedCreateInput, tx?: PrismaTransaction): Promise<Invoice>;
  update(id: string, expectedVersion: number, data: Prisma.InvoiceUncheckedUpdateInput, tx?: PrismaTransaction): Promise<Invoice>;
  softDelete(id: string, expectedVersion: number, tx?: PrismaTransaction): Promise<Invoice>;
}
