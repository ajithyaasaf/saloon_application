import { LoyaltyLedger, LoyaltyTransactionType } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';

export interface ILoyaltyLedgerRepository {
  findByCustomer(customerProfileId: string, tx?: PrismaTransaction): Promise<LoyaltyLedger[]>;
  create(
    customerProfileId: string,
    type: LoyaltyTransactionType,
    points: number,
    previousBalance: number,
    newBalance: number,
    createdByUserId: string,
    referenceType?: string,
    referenceId?: string,
    description?: string,
    tx?: PrismaTransaction,
  ): Promise<LoyaltyLedger>;
}
