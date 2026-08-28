import { Injectable, Logger } from '@nestjs/common';
import { ReferralReward } from '@prisma/client';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { IReferralRewardRepository } from './interfaces/referral-reward.repository.interface';

@Injectable()
export class ReferralRewardRepository implements IReferralRewardRepository {
  private readonly logger = new Logger(ReferralRewardRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findByReferral(customerReferralId: string, tx?: PrismaTransaction): Promise<ReferralReward[]> {
    const client = tx ?? this.prisma;
    return client.referralReward.findMany({
      where: { customerReferralId },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async create(
    customerReferralId: string,
    customerProfileId: string,
    rewardType: string,
    amount: number,
    tx?: PrismaTransaction,
  ): Promise<ReferralReward> {
    const client = tx ?? this.prisma;
    try {
      return await client.referralReward.create({
        data: {
          customerReferralId,
          customerProfileId,
          rewardType,
          amount,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create ReferralReward: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseException('Failed to record referral reward');
    }
  }
}
