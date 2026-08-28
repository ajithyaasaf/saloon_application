import { Injectable, Logger } from '@nestjs/common';
import { CustomerLoyalty, Prisma } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { ICustomerLoyaltyRepository } from './interfaces/customer-loyalty.repository.interface';

@Injectable()
export class CustomerLoyaltyRepository implements ICustomerLoyaltyRepository {
  private readonly logger = new Logger(CustomerLoyaltyRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findByCustomer(customerProfileId: string, tx?: PrismaTransaction): Promise<CustomerLoyalty | null> {
    const client = tx ?? this.prisma;
    return client.customerLoyalty.findUnique({
      where: { customerProfileId },
    });
  }

  public async create(customerProfileId: string, initialTier = 'SILVER', tx?: PrismaTransaction): Promise<CustomerLoyalty> {
    const client = tx ?? this.prisma;
    try {
      return await client.customerLoyalty.create({
        data: {
          customerProfileId,
          pointsBalance: 0,
          lifetimePointsEarned: 0,
          currentTier: initialTier,
          version: 1,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(ERROR_CODES.DATABASE.UNIQUE_VIOLATION, 'Loyalty account already exists for customer');
      }
      this.logger.error(`Failed to create CustomerLoyalty: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseException('Failed to create customer loyalty account');
    }
  }

  public async update(
    customerProfileId: string,
    pointsBalance: number,
    lifetimePointsEarned: number,
    currentTier: string,
    expectedVersion: number,
    tx?: PrismaTransaction,
  ): Promise<CustomerLoyalty> {
    const client = tx ?? this.prisma;
    const existing = await this.findByCustomer(customerProfileId, tx);
    if (!existing) {
      throw new DatabaseException('Customer loyalty account not found');
    }

    if (existing.version !== expectedVersion) {
      throw new ConflictException(
        ERROR_CODES.DATABASE.UNIQUE_VIOLATION,
        `Version mismatch. Expected ${existing.version}, received ${expectedVersion}`,
      );
    }

    try {
      return await client.customerLoyalty.update({
        where: { customerProfileId },
        data: {
          pointsBalance,
          lifetimePointsEarned,
          currentTier,
          version: { increment: 1 },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to update CustomerLoyalty: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseException('Failed to update customer loyalty account');
    }
  }
}
