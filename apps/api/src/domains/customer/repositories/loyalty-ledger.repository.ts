import { Injectable, Logger } from '@nestjs/common';
import { LoyaltyLedger, LoyaltyTransactionType } from '@prisma/client';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { ILoyaltyLedgerRepository } from './interfaces/loyalty-ledger.repository.interface';

@Injectable()
export class LoyaltyLedgerRepository implements ILoyaltyLedgerRepository {
  private readonly logger = new Logger(LoyaltyLedgerRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findByCustomer(customerProfileId: string, tx?: PrismaTransaction): Promise<LoyaltyLedger[]> {
    const client = tx ?? this.prisma;
    return client.loyaltyLedger.findMany({
      where: { customerProfileId },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async create(
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
  ): Promise<LoyaltyLedger> {
    const client = tx ?? this.prisma;
    try {
      return await client.loyaltyLedger.create({
        data: {
          customerProfileId,
          type,
          points,
          previousBalance,
          newBalance,
          createdByUserId,
          referenceType,
          referenceId,
          description,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create LoyaltyLedger entry: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseException('Failed to record loyalty ledger transaction');
    }
  }
}
