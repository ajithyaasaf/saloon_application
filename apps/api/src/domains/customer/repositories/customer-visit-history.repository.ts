import { Injectable, Logger } from '@nestjs/common';
import { CustomerVisitHistory } from '@prisma/client';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { ICustomerVisitHistoryRepository } from './interfaces/customer-visit-history.repository.interface';

@Injectable()
export class CustomerVisitHistoryRepository implements ICustomerVisitHistoryRepository {
  private readonly logger = new Logger(CustomerVisitHistoryRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findByCustomer(customerProfileId: string, tx?: PrismaTransaction): Promise<CustomerVisitHistory[]> {
    const client = tx ?? this.prisma;
    return client.customerVisitHistory.findMany({
      where: { customerProfileId },
      orderBy: { visitDate: 'desc' },
    });
  }

  public async create(
    customerProfileId: string,
    bookingId: string,
    branchId: string,
    staffIds: string[],
    serviceIds: string[],
    totalAmount: number,
    visitDate: Date,
    tx?: PrismaTransaction,
  ): Promise<CustomerVisitHistory> {
    const client = tx ?? this.prisma;
    try {
      return await client.customerVisitHistory.create({
        data: {
          customerProfileId,
          bookingId,
          branchId,
          staffIds,
          serviceIds,
          totalAmount,
          visitDate,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create CustomerVisitHistory: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseException('Failed to record customer visit history');
    }
  }
}
