import { Injectable, Logger } from '@nestjs/common';
import { CustomerProfile, Prisma } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { CreateCustomerProfileDto, UpdateCustomerProfileDto } from '../dto/customer-profile.dto';
import { SearchCustomerQueryDto } from '../dto/search-customer-query.dto';
import { ICustomerProfileRepository } from './interfaces/customer-profile.repository.interface';

@Injectable()
export class CustomerProfileRepository implements ICustomerProfileRepository {
  private readonly logger = new Logger(CustomerProfileRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<CustomerProfile | null> {
    const client = tx ?? this.prisma;
    return client.customerProfile.findFirst({
      where: { id, deletedAt: null },
      include: {
        preference: true,
        loyalty: true,
        tagAssignments: { include: { tag: true } },
        memberships: { where: { deletedAt: null, status: 'ACTIVE' } },
      },
    });
  }

  public async findByCustomerCode(code: string, tx?: PrismaTransaction): Promise<CustomerProfile | null> {
    const client = tx ?? this.prisma;
    return client.customerProfile.findFirst({
      where: { customerCode: code, deletedAt: null },
      include: { preference: true, loyalty: true },
    });
  }

  public async findByPhone(salonId: string, phone: string, tx?: PrismaTransaction): Promise<CustomerProfile | null> {
    const client = tx ?? this.prisma;
    return client.customerProfile.findFirst({
      where: { salonId, phone, deletedAt: null },
      include: { preference: true, loyalty: true },
    });
  }

  public async findByEmail(salonId: string, email: string, tx?: PrismaTransaction): Promise<CustomerProfile | null> {
    const client = tx ?? this.prisma;
    return client.customerProfile.findFirst({
      where: { salonId, email, deletedAt: null },
      include: { preference: true, loyalty: true },
    });
  }

  public async findBySalon(salonId: string, tx?: PrismaTransaction): Promise<CustomerProfile[]> {
    const client = tx ?? this.prisma;
    return client.customerProfile.findMany({
      where: { salonId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findByBranch(branchId: string, tx?: PrismaTransaction): Promise<CustomerProfile[]> {
    const client = tx ?? this.prisma;
    return client.customerProfile.findMany({
      where: { primaryBranchId: branchId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findByUser(userId: string, tx?: PrismaTransaction): Promise<CustomerProfile[]> {
    const client = tx ?? this.prisma;
    return client.customerProfile.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async search(query: SearchCustomerQueryDto, tx?: PrismaTransaction): Promise<{ data: CustomerProfile[]; total: number }> {
    const client = tx ?? this.prisma;
    const { page = 1, limit = 10, salonId, branchId, search, status, membershipStatus, loyaltyTier, blacklisted, tagId, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerProfileWhereInput = {
      deletedAt: null,
      ...(salonId && { salonId }),
      ...(branchId && { primaryBranchId: branchId }),
      ...(status && { status }),
      ...(blacklisted !== undefined && { isBlacklisted: blacklisted }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
          { customerCode: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(tagId && { tagAssignments: { some: { tagId } } }),
      ...(loyaltyTier && { loyalty: { currentTier: loyaltyTier } }),
      ...(membershipStatus && { memberships: { some: { status: membershipStatus, deletedAt: null } } }),
    };

    try {
      const [data, total] = await Promise.all([
        client.customerProfile.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: { loyalty: true, tagAssignments: { include: { tag: true } } },
        }),
        client.customerProfile.count({ where }),
      ]);

      return { data, total };
    } catch (error) {
      this.logger.error(`Error searching customers: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseException('Failed to search customer profiles');
    }
  }

  public async count(salonId: string, tx?: PrismaTransaction): Promise<number> {
    const client = tx ?? this.prisma;
    return client.customerProfile.count({
      where: { salonId, deletedAt: null },
    });
  }

  public async create(dto: CreateCustomerProfileDto, customerCode: string, createdByUserId: string, tx?: PrismaTransaction): Promise<CustomerProfile> {
    const client = tx ?? this.prisma;
    try {
      return await client.customerProfile.create({
        data: {
          customerCode,
          salonId: dto.salonId,
          primaryBranchId: dto.primaryBranchId,
          userId: dto.userId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          phone: dto.phone,
          gender: dto.gender,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
          anniversaryDate: dto.anniversaryDate ? new Date(dto.anniversaryDate) : undefined,
          isBlacklisted: dto.isBlacklisted ?? false,
          blacklistType: dto.blacklistType,
          blacklistReason: dto.blacklistReason,
          blacklistedAt: dto.isBlacklisted ? new Date() : undefined,
          blacklistedByUserId: dto.isBlacklisted ? createdByUserId : undefined,
          createdByUserId,
          version: 1,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(ERROR_CODES.CRM.CUSTOMER_EXISTS, 'Customer profile already exists with this phone or code');
      }
      this.logger.error(`Failed to create CustomerProfile: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseException('Failed to create customer profile');
    }
  }

  public async update(id: string, dto: UpdateCustomerProfileDto, updatedByUserId: string, tx?: PrismaTransaction): Promise<CustomerProfile> {
    const client = tx ?? this.prisma;
    const existing = await this.findById(id, tx);
    if (!existing) {
      throw new DatabaseException('Customer profile not found');
    }

    if (existing.version !== dto.version) {
      throw new ConflictException(
        ERROR_CODES.DATABASE.UNIQUE_VIOLATION,
        `Version mismatch. Expected ${existing.version}, received ${dto.version}`,
      );
    }

    try {
      return await client.customerProfile.update({
        where: { id },
        data: {
          ...(dto.firstName && { firstName: dto.firstName }),
          ...(dto.lastName !== undefined && { lastName: dto.lastName }),
          ...(dto.email !== undefined && { email: dto.email }),
          ...(dto.phone && { phone: dto.phone }),
          ...(dto.gender !== undefined && { gender: dto.gender }),
          ...(dto.birthDate !== undefined && { birthDate: dto.birthDate ? new Date(dto.birthDate) : null }),
          ...(dto.anniversaryDate !== undefined && { anniversaryDate: dto.anniversaryDate ? new Date(dto.anniversaryDate) : null }),
          ...(dto.status && { status: dto.status }),
          ...(dto.primaryBranchId && { primaryBranchId: dto.primaryBranchId }),
          ...(dto.isBlacklisted !== undefined && {
            isBlacklisted: dto.isBlacklisted,
            blacklistType: dto.blacklistType,
            blacklistReason: dto.blacklistReason,
            blacklistedAt: dto.isBlacklisted ? new Date() : null,
            blacklistedByUserId: dto.isBlacklisted ? updatedByUserId : null,
          }),
          updatedByUserId,
          version: { increment: 1 },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to update CustomerProfile: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseException('Failed to update customer profile');
    }
  }

  public async softDelete(id: string, updatedByUserId: string, tx?: PrismaTransaction): Promise<CustomerProfile> {
    const client = tx ?? this.prisma;
    try {
      return await client.customerProfile.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedByUserId,
          version: { increment: 1 },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to soft delete CustomerProfile: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseException('Failed to soft delete customer profile');
    }
  }
}
