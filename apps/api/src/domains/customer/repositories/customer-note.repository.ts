import { Injectable, Logger } from '@nestjs/common';
import { CustomerNote } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { CreateCustomerNoteDto, UpdateCustomerNoteDto } from '../dto/customer-note.dto';
import { ICustomerNoteRepository } from './interfaces/customer-note.repository.interface';

@Injectable()
export class CustomerNoteRepository implements ICustomerNoteRepository {
  private readonly logger = new Logger(CustomerNoteRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<CustomerNote | null> {
    const client = tx ?? this.prisma;
    return client.customerNote.findFirst({
      where: { id, deletedAt: null },
    });
  }

  public async findByCustomer(customerProfileId: string, tx?: PrismaTransaction): Promise<CustomerNote[]> {
    const client = tx ?? this.prisma;
    return client.customerNote.findMany({
      where: { customerProfileId, deletedAt: null },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
  }

  public async findByBranch(branchId: string, tx?: PrismaTransaction): Promise<CustomerNote[]> {
    const client = tx ?? this.prisma;
    return client.customerNote.findMany({
      where: { branchId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async create(dto: CreateCustomerNoteDto, createdByUserId: string, tx?: PrismaTransaction): Promise<CustomerNote> {
    const client = tx ?? this.prisma;
    try {
      return await client.customerNote.create({
        data: {
          customerProfileId: dto.customerProfileId,
          branchId: dto.branchId,
          note: dto.note,
          isPinned: dto.isPinned ?? false,
          isPrivate: dto.isPrivate ?? false,
          createdByUserId,
          version: 1,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create CustomerNote: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseException('Failed to create customer note');
    }
  }

  public async update(id: string, dto: UpdateCustomerNoteDto, updatedByUserId: string, tx?: PrismaTransaction): Promise<CustomerNote> {
    const client = tx ?? this.prisma;
    const existing = await this.findById(id, tx);
    if (!existing) {
      throw new DatabaseException('Customer note not found');
    }

    if (existing.version !== dto.version) {
      throw new ConflictException(
        ERROR_CODES.DATABASE.UNIQUE_VIOLATION,
        `Version mismatch. Expected ${existing.version}, received ${dto.version}`,
      );
    }

    try {
      return await client.customerNote.update({
        where: { id },
        data: {
          ...(dto.note && { note: dto.note }),
          ...(dto.isPinned !== undefined && { isPinned: dto.isPinned }),
          ...(dto.isPrivate !== undefined && { isPrivate: dto.isPrivate }),
          updatedByUserId,
          version: { increment: 1 },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to update CustomerNote: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseException('Failed to update customer note');
    }
  }

  public async softDelete(id: string, updatedByUserId: string, tx?: PrismaTransaction): Promise<CustomerNote> {
    const client = tx ?? this.prisma;
    try {
      return await client.customerNote.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedByUserId,
          version: { increment: 1 },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to soft delete CustomerNote: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseException('Failed to soft delete customer note');
    }
  }
}
