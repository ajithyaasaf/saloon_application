import { CustomerMergeHistory } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';

export interface ICustomerMergeHistoryRepository {
  findByCustomer(targetCustomerProfileId: string, tx?: PrismaTransaction): Promise<CustomerMergeHistory[]>;
  create(
    sourceCustomerProfileId: string,
    targetCustomerProfileId: string,
    sourceSnapshot: Record<string, any>,
    mergedByUserId: string,
    mergeReason?: string,
    tx?: PrismaTransaction,
  ): Promise<CustomerMergeHistory>;
}
