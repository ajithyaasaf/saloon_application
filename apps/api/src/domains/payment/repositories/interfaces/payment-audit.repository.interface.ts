import { PaymentAudit, Prisma } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';

export interface IPaymentAuditRepository {
  findByPayment(paymentId: string, tx?: PrismaTransaction): Promise<PaymentAudit[]>;
  create(data: Prisma.PaymentAuditUncheckedCreateInput, tx?: PrismaTransaction): Promise<PaymentAudit>;
}
