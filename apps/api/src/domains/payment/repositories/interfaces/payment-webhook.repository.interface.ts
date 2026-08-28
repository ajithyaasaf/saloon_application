import { PaymentWebhookLog, Prisma } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';

export interface IPaymentWebhookRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<PaymentWebhookLog | null>;
  findByEventId(eventId: string, tx?: PrismaTransaction): Promise<PaymentWebhookLog | null>;
  findUnprocessed(limit?: number, tx?: PrismaTransaction): Promise<PaymentWebhookLog[]>;
  create(data: Prisma.PaymentWebhookLogUncheckedCreateInput, tx?: PrismaTransaction): Promise<PaymentWebhookLog>;
  markProcessed(id: string, processingError?: string, tx?: PrismaTransaction): Promise<PaymentWebhookLog>;
}
