import { PaymentTransaction, Prisma } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';

export interface IPaymentTransactionRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<PaymentTransaction | null>;
  findByPayment(paymentId: string, tx?: PrismaTransaction): Promise<PaymentTransaction[]>;
  findByProviderTransactionId(providerTransactionId: string, tx?: PrismaTransaction): Promise<PaymentTransaction | null>;
  findByGatewayReference(gatewayReference: string, tx?: PrismaTransaction): Promise<PaymentTransaction[]>;
  create(data: Prisma.PaymentTransactionUncheckedCreateInput, tx?: PrismaTransaction): Promise<PaymentTransaction>;
  update(id: string, expectedVersion: number, data: Prisma.PaymentTransactionUncheckedUpdateInput, tx?: PrismaTransaction): Promise<PaymentTransaction>;
}
