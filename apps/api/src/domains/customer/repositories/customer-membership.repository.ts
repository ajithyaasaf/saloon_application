import { Injectable, Logger } from '@nestjs/common';
import { CustomerMembership } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { CreateCustomerMembershipDto, UpdateCustomerMembershipDto } from '../dto/customer-membership.dto';
import { ICustomerMembershipRepository } from './interfaces/customer-membership.repository.interface';

@Injectable()
export class CustomerMembershipRepository implements ICustomerMembershipRepository {
  private readonly logger = new Logger(CustomerMembershipRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<CustomerMembership | null> {
    const client = tx ?? this.prisma;
    return client.customerMembership.findFirst({
      where: { id, deletedAt: null },
      include: { membershipPlan: true },
    });
  }

  public async findByCustomer(customerProfileId: string, tx?: PrismaTransaction): Promise<CustomerMembership[]> {
    const client = tx ?? this.prisma;
    return client.customerMembership.findMany({
      where: { customerProfileId, deletedAt: null },
      include: { membershipPlan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findActiveMembership(customerProfileId: string, tx?: PrismaTransaction): Promise<CustomerMembership | null> {
    const client = tx ?? this.prisma;
    return client.customerMembership.findFirst({
      where: {
        customerProfileId,
        status: 'ACTIVE',
        endDate: { gte: new Date() },
        deletedAt: null,
      },
      include: { membershipPlan: true },
      orderBy: { endDate: 'desc' },
    });
  }

  public async create(dto: CreateCustomerMembershipDto, createdByUserId: string, tx?: PrismaTransaction): Promise<CustomerMembership> {
    const client = tx ?? this.prisma;
    try {
      return await client.customerMembership.create({
        data: {
          customerProfileId: dto.customerProfileId,
          membershipPlanId: dto.membershipPlanId,
          status: 'ACTIVE',
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          pricePaid: dto.pricePaid,
          discountPercentage: dto.discountPercentage ?? 0,
          autoRenew: dto.autoRenew ?? false,
          createdByUserId,
          version: 1,
        },
        include: { membershipPlan: true },
      });
    } catch (error) {
      this.logger.error(`Failed to create CustomerMembership: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseException('Failed to create customer membership');
    }
  }

  public async update(id: string, dto: UpdateCustomerMembershipDto, updatedByUserId: string, tx?: PrismaTransaction): Promise<CustomerMembership> {
    const client = tx ?? this.prisma;
    const existing = await this.findById(id, tx);
    if (!existing) {
      throw new DatabaseException('Customer membership not found');
    }

    if (existing.version !== dto.version) {
      throw new ConflictException(
        ERROR_CODES.DATABASE.UNIQUE_VIOLATION,
        `Version mismatch. Expected ${existing.version}, received ${dto.version}`,
      );
    }

    try {
      return await client.customerMembership.update({
        where: { id },
        data: {
          ...(dto.status && { status: dto.status }),
          ...(dto.endDate && { endDate: new Date(dto.endDate) }),
          ...(dto.autoRenew !== undefined && { autoRenew: dto.autoRenew }),
          updatedByUserId,
          version: { increment: 1 },
        },
        include: { membershipPlan: true },
      });
    } catch (error) {
      this.logger.error(`Failed to update CustomerMembership: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseException('Failed to update customer membership');
    }
  }

  public async softDelete(id: string, updatedByUserId: string, tx?: PrismaTransaction): Promise<CustomerMembership> {
    const client = tx ?? this.prisma;
    try {
      return await client.customerMembership.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedByUserId,
          version: { increment: 1 },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to soft delete CustomerMembership: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseException('Failed to soft delete customer membership');
    }
  }
}
