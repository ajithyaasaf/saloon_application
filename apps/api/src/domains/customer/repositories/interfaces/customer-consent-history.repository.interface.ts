import { ConsentChannel, CustomerConsentHistory } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';

export interface ICustomerConsentHistoryRepository {
  findByCustomer(customerProfileId: string, tx?: PrismaTransaction): Promise<CustomerConsentHistory[]>;
  create(
    customerProfileId: string,
    channel: ConsentChannel,
    previousValue: boolean,
    newValue: boolean,
    changedByUserId: string,
    clientIp?: string,
    userAgent?: string,
    tx?: PrismaTransaction,
  ): Promise<CustomerConsentHistory>;
}
