import { Injectable, Logger } from '@nestjs/common';
import { MembershipPlan, Prisma } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { CreateMembershipPlanDto, UpdateMembershipPlanDto } from '../dto/membership-plan.dto';
import { IMembershipPlanRepository } from './interfaces/membership-plan.repository.interface';

@Injectable()
export class MembershipPlanRepository implements IMembershipPlanRepository {
  private readonly logger = new Logger(MembershipPlanRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<MembershipPlan | null> {
    const client = tx ?? this.prisma;
    return client.membershipPlan.findFirst({
      where: { id, deletedAt: null },
    });
  }

  public async findBySalon(salonId: string, tx?: PrismaTransaction): Promise<MembershipPlan[]> {
    const client = tx ?? this.prisma;
    return client.membershipPlan.findMany({
      where: { salonId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findByCode(salonId: string, planCode: string, tx?: PrismaTransaction): Promise<MembershipPlan | null> {
    const client = tx ?? this.prisma;
    return client.membershipPlan.findFirst({
      where: { salonId, planCode, deletedAt: null },
    });
  }

  public async create(dto: CreateMembershipPlanDto, createdByUserId: string, tx?: PrismaTransaction): Promise<MembershipPlan> {
    const client = tx ?? this.prisma;
    try {
      return await client.membershipPlan.create({
        data: {
          salonId: dto.salonId,
          planCode: dto.planCode,
          name: dto.name,
          description: dto.description,
          price: dto.price,
          validityDays: dto.validityDays,
          discountPercentage: dto.discountPercentage ?? 0,
          benefits: dto.benefits ? (dto.benefits as Prisma.InputJsonValue) : Prisma.JsonNull,
          isActive: dto.isActive ?? true,
          createdByUserId,
          version: 1,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(ERROR_CODES.DATABASE.UNIQUE_VIOLATION, 'Membership plan with this code already exists');
      }
      this.logger.error(`Failed to create MembershipPlan: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseException('Failed to create membership plan');
    }
  }

  public async update(id: string, dto: UpdateMembershipPlanDto, updatedByUserId: string, tx?: PrismaTransaction): Promise<MembershipPlan> {
    const client = tx ?? this.prisma;
    const existing = await this.findById(id, tx);
    if (!existing) {
      throw new DatabaseException('Membership plan not found');
    }

    if (existing.version !== dto.version) {
      throw new ConflictException(
        ERROR_CODES.DATABASE.UNIQUE_VIOLATION,
        `Version mismatch. Expected ${existing.version}, received ${dto.version}`,
      );
    }

    try {
      return await client.membershipPlan.update({
        where: { id },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.price !== undefined && { price: dto.price }),
          ...(dto.validityDays !== undefined && { validityDays: dto.validityDays }),
          ...(dto.discountPercentage !== undefined && { discountPercentage: dto.discountPercentage }),
          ...(dto.benefits !== undefined && { benefits: dto.benefits as Prisma.InputJsonValue }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
          updatedByUserId,
          version: { increment: 1 },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to update MembershipPlan: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseException('Failed to update membership plan');
    }
  }

  public async softDelete(id: string, updatedByUserId: string, tx?: PrismaTransaction): Promise<MembershipPlan> {
    const client = tx ?? this.prisma;
    try {
      return await client.membershipPlan.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedByUserId,
          version: { increment: 1 },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to soft delete MembershipPlan: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseException('Failed to soft delete membership plan');
    }
  }
}
