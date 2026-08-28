import { Injectable, Logger } from '@nestjs/common';
import { CustomerMergeHistory, Prisma } from '@prisma/client';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { ICustomerMergeHistoryRepository } from './interfaces/customer-merge-history.repository.interface';

@Injectable()
export class CustomerMergeHistoryRepository implements ICustomerMergeHistoryRepository {
  private readonly logger = new Logger(CustomerMergeHistoryRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findByCustomer(targetCustomerProfileId: string, tx?: PrismaTransaction): Promise<CustomerMergeHistory[]> {
    const client = tx ?? this.prisma;
    return client.customerMergeHistory.findMany({
      where: { targetCustomerProfileId },
      orderBy: { mergedAt: 'desc' },
    });
  }

  public async create(
    sourceCustomerProfileId: string,
    targetCustomerProfileId: string,
    sourceSnapshot: Record<string, any>,
    mergedByUserId: string,
    mergeReason?: string,
    tx?: PrismaTransaction,
  ): Promise<CustomerMergeHistory> {
    const client = tx ?? this.prisma;
    try {
      return await client.customerMergeHistory.create({
        data: {
          sourceCustomerProfileId,
          targetCustomerProfileId,
          sourceSnapshot: sourceSnapshot as Prisma.InputJsonValue,
          mergedByUserId,
          mergeReason,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create CustomerMergeHistory: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseException('Failed to record customer merge history');
    }
  }
}
