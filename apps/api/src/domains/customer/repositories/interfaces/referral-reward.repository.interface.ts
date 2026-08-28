import { ReferralReward } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';

export interface IReferralRewardRepository {
  findByReferral(customerReferralId: string, tx?: PrismaTransaction): Promise<ReferralReward[]>;
  create(
    customerReferralId: string,
    customerProfileId: string,
    rewardType: string,
    amount: number,
    tx?: PrismaTransaction,
  ): Promise<ReferralReward>;
}
