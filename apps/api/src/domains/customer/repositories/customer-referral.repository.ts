import { Injectable, Logger } from '@nestjs/common';
import { CustomerReferral, ReferralStatus } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { CreateReferralDto } from '../dto/customer-referral.dto';
import { ICustomerReferralRepository } from './interfaces/customer-referral.repository.interface';

@Injectable()
export class CustomerReferralRepository implements ICustomerReferralRepository {
  private readonly logger = new Logger(CustomerReferralRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<CustomerReferral | null> {
    const client = tx ?? this.prisma;
    return client.customerReferral.findFirst({
      where: { id, deletedAt: null },
      include: { rewards: true },
    });
  }

  public async findByCustomer(referrerCustomerProfileId: string, tx?: PrismaTransaction): Promise<CustomerReferral[]> {
    const client = tx ?? this.prisma;
    return client.customerReferral.findMany({
      where: { referrerCustomerProfileId, deletedAt: null },
      include: { rewards: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async create(dto: CreateReferralDto, createdByUserId: string, tx?: PrismaTransaction): Promise<CustomerReferral> {
    const client = tx ?? this.prisma;
    try {
      return await client.customerReferral.create({
        data: {
          referrerCustomerProfileId: dto.referrerCustomerProfileId,
          referredPhone: dto.referredPhone,
          referredEmail: dto.referredEmail,
          status: 'PENDING',
          rewardPoints: dto.rewardPoints ?? 0,
          rewardAmount: dto.rewardAmount ?? 0,
          createdByUserId,
          version: 1,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create CustomerReferral: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseException('Failed to create customer referral');
    }
  }

  public async update(
    id: string,
    status: ReferralStatus,
    referredCustomerProfileId?: string,
    updatedByUserId?: string,
    expectedVersion?: number,
    tx?: PrismaTransaction,
  ): Promise<CustomerReferral> {
    const client = tx ?? this.prisma;
    const existing = await this.findById(id, tx);
    if (!existing) {
      throw new DatabaseException('Customer referral not found');
    }

    if (expectedVersion !== undefined && existing.version !== expectedVersion) {
      throw new ConflictException(
        ERROR_CODES.DATABASE.UNIQUE_VIOLATION,
        `Version mismatch. Expected ${existing.version}, received ${expectedVersion}`,
      );
    }

    try {
      return await client.customerReferral.update({
        where: { id },
        data: {
          status,
          ...(referredCustomerProfileId && { referredCustomerProfileId }),
          ...(updatedByUserId && { updatedByUserId }),
          version: { increment: 1 },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to update CustomerReferral: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseException('Failed to update customer referral');
    }
  }
}
