import { CustomerLoyalty } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';

export interface ICustomerLoyaltyRepository {
  findByCustomer(customerProfileId: string, tx?: PrismaTransaction): Promise<CustomerLoyalty | null>;
  create(customerProfileId: string, initialTier?: string, tx?: PrismaTransaction): Promise<CustomerLoyalty>;
  update(
    customerProfileId: string,
    pointsBalance: number,
    lifetimePointsEarned: number,
    currentTier: string,
    expectedVersion: number,
    tx?: PrismaTransaction,
  ): Promise<CustomerLoyalty>;
}
