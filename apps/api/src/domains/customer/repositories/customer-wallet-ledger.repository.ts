import { Injectable, Logger } from '@nestjs/common';
import { CustomerWalletLedger, WalletTransactionType } from '@prisma/client';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { ICustomerWalletLedgerRepository } from './interfaces/customer-wallet-ledger.repository.interface';

@Injectable()
export class CustomerWalletLedgerRepository implements ICustomerWalletLedgerRepository {
  private readonly logger = new Logger(CustomerWalletLedgerRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findByCustomer(customerProfileId: string, tx?: PrismaTransaction): Promise<CustomerWalletLedger[]> {
    const client = tx ?? this.prisma;
    return client.customerWalletLedger.findMany({
      where: { customerProfileId },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async create(
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
  ): Promise<CustomerWalletLedger> {
    const client = tx ?? this.prisma;
    try {
      return await client.customerWalletLedger.create({
        data: {
          customerProfileId,
          type,
          amount,
          previousBalance,
          newBalance,
          createdByUserId,
          referenceType,
          referenceId,
          description,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create CustomerWalletLedger entry: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseException('Failed to record wallet ledger transaction');
    }
  }
}
