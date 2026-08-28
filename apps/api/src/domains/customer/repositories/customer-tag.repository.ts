import { Injectable, Logger } from '@nestjs/common';
import { CustomerTag, Prisma } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { CreateCustomerTagDto, UpdateCustomerTagDto } from '../dto/customer-tag.dto';
import { ICustomerTagRepository } from './interfaces/customer-tag.repository.interface';

@Injectable()
export class CustomerTagRepository implements ICustomerTagRepository {
  private readonly logger = new Logger(CustomerTagRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<CustomerTag | null> {
    const client = tx ?? this.prisma;
    return client.customerTag.findFirst({
      where: { id, deletedAt: null },
    });
  }

  public async findBySalon(salonId: string, tx?: PrismaTransaction): Promise<CustomerTag[]> {
    const client = tx ?? this.prisma;
    return client.customerTag.findMany({
      where: { salonId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  public async findByName(salonId: string, name: string, tx?: PrismaTransaction): Promise<CustomerTag | null> {
    const client = tx ?? this.prisma;
    return client.customerTag.findFirst({
      where: { salonId, name, deletedAt: null },
    });
  }

  public async create(dto: CreateCustomerTagDto, createdByUserId: string, tx?: PrismaTransaction): Promise<CustomerTag> {
    const client = tx ?? this.prisma;
    try {
      return await client.customerTag.create({
        data: {
          salonId: dto.salonId,
          name: dto.name,
          color: dto.color ?? '#6B7280',
          description: dto.description,
          createdByUserId,
          version: 1,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(ERROR_CODES.DATABASE.UNIQUE_VIOLATION, 'Tag with this name already exists in salon');
      }
      this.logger.error(`Failed to create CustomerTag: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseException('Failed to create customer tag');
    }
  }

  public async update(id: string, dto: UpdateCustomerTagDto, updatedByUserId: string, tx?: PrismaTransaction): Promise<CustomerTag> {
    const client = tx ?? this.prisma;
    const existing = await this.findById(id, tx);
    if (!existing) {
      throw new DatabaseException('Customer tag not found');
    }

    if (existing.version !== dto.version) {
      throw new ConflictException(
        ERROR_CODES.DATABASE.UNIQUE_VIOLATION,
        `Version mismatch. Expected ${existing.version}, received ${dto.version}`,
      );
    }

    try {
      return await client.customerTag.update({
        where: { id },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.color && { color: dto.color }),
          ...(dto.description !== undefined && { description: dto.description }),
          updatedByUserId,
          version: { increment: 1 },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to update CustomerTag: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseException('Failed to update customer tag');
    }
  }

  public async softDelete(id: string, updatedByUserId: string, tx?: PrismaTransaction): Promise<CustomerTag> {
    const client = tx ?? this.prisma;
    try {
      return await client.customerTag.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedByUserId,
          version: { increment: 1 },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to soft delete CustomerTag: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseException('Failed to soft delete customer tag');
    }
  }
}
