import { Injectable, Logger } from '@nestjs/common';
import { ConsentChannel, CustomerConsentHistory } from '@prisma/client';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { ICustomerConsentHistoryRepository } from './interfaces/customer-consent-history.repository.interface';

@Injectable()
export class CustomerConsentHistoryRepository implements ICustomerConsentHistoryRepository {
  private readonly logger = new Logger(CustomerConsentHistoryRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findByCustomer(customerProfileId: string, tx?: PrismaTransaction): Promise<CustomerConsentHistory[]> {
    const client = tx ?? this.prisma;
    return client.customerConsentHistory.findMany({
      where: { customerProfileId },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async create(
    customerProfileId: string,
    channel: ConsentChannel,
    previousValue: boolean,
    newValue: boolean,
    changedByUserId: string,
    clientIp?: string,
    userAgent?: string,
    tx?: PrismaTransaction,
  ): Promise<CustomerConsentHistory> {
    const client = tx ?? this.prisma;
    try {
      return await client.customerConsentHistory.create({
        data: {
          customerProfileId,
          channel,
          previousValue,
          newValue,
          changedByUserId,
          clientIp,
          userAgent,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to record CustomerConsentHistory: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseException('Failed to record consent history');
    }
  }
}
