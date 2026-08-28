import { CustomerWalletLedger, WalletTransactionType } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';

export interface ICustomerWalletLedgerRepository {
  findByCustomer(customerProfileId: string, tx?: PrismaTransaction): Promise<CustomerWalletLedger[]>;
  create(
    customerProfileId: string,
    type: WalletTransactionType,
    amount: number,
    previousBalance: number,
    newBalance: number,
    createdByUserId: string,
    referenceType?: string,
    referenceId?: string,
    description?: string,
    tx?: PrismaTransaction,
  ): Promise<CustomerWalletLedger>;
}
