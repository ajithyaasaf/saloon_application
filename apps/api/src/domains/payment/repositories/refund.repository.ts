import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Refund, RefundStatus } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { IRefundRepository } from './interfaces/refund.repository.interface';

/**
 * RefundRepository — Prisma data access for Refund entity.
 *
 * Soft Delete: Filters `deletedAt IS NULL`.
 * Optimistic Locking: Validates and increments `version`.
 * Uses Indexes: `uq_refunds_code`, `idx_refunds_payment`, `idx_refunds_booking`, `idx_refunds_status`.
 *
 * Architecture ref: Phase 14.0 & Phase 14.2
 */
@Injectable()
export class RefundRepository implements IRefundRepository {
  private readonly logger = new Logger(RefundRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<Refund | null> {
    const client = tx ?? this.prisma;
    return client.refund.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  public async findByRefundCode(code: string, tx?: PrismaTransaction): Promise<Refund | null> {
    const client = tx ?? this.prisma;
    return client.refund.findFirst({
      where: {
        refundCode: code,
        deletedAt: null,
      },
    });
  }

  public async findByPayment(paymentId: string, tx?: PrismaTransaction): Promise<Refund[]> {
    const client = tx ?? this.prisma;
    return client.refund.findMany({
      where: {
        paymentId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findByBooking(bookingId: string, tx?: PrismaTransaction): Promise<Refund[]> {
    const client = tx ?? this.prisma;
    return client.refund.findMany({
      where: {
        bookingId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findByStatus(status: RefundStatus, tx?: PrismaTransaction): Promise<Refund[]> {
    const client = tx ?? this.prisma;
    return client.refund.findMany({
      where: {
        status,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async create(data: Prisma.RefundUncheckedCreateInput, tx?: PrismaTransaction): Promise<Refund> {
    const client = tx ?? this.prisma;
    try {
      return await client.refund.create({
        data: {
          ...data,
          version: 1,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          ERROR_CODES.DATABASE.UNIQUE_VIOLATION,
          'Refund with unique code already exists',
        );
      }
      this.logger.error(`Failed to create refund: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseException('Failed to create refund in database');
    }
  }

  public async update(
    id: string,
    expectedVersion: number,
    data: Prisma.RefundUncheckedUpdateInput,
    tx?: PrismaTransaction,
  ): Promise<Refund> {
    const client = tx ?? this.prisma;
    const result = await client.refund.updateMany({
      where: {
        id,
        version: expectedVersion,
        deletedAt: null,
      },
      data: {
        ...data,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      const existing = await client.refund.findUnique({ where: { id } });
      if (!existing || existing.deletedAt !== null) {
        throw new DatabaseException('Refund record not found or soft-deleted');
      }
      throw new ConflictException(
        ERROR_CODES.DATABASE.UNIQUE_VIOLATION,
        `Optimistic lock failed for Refund ID ${id}. Expected version ${expectedVersion}, found ${existing.version}`,
      );
    }

    const updated = await this.findById(id, tx);
    if (!updated) {
      throw new DatabaseException('Failed to retrieve updated refund record');
    }
    return updated;
  }

  public async softDelete(id: string, expectedVersion: number, tx?: PrismaTransaction): Promise<Refund> {
    const client = tx ?? this.prisma;
    const result = await client.refund.updateMany({
      where: {
        id,
        version: expectedVersion,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      const existing = await client.refund.findUnique({ where: { id } });
      if (!existing || existing.deletedAt !== null) {
        throw new DatabaseException('Refund record not found or already deleted');
      }
      throw new ConflictException(
        ERROR_CODES.DATABASE.UNIQUE_VIOLATION,
        `Optimistic lock failed for soft delete on Refund ID ${id}`,
      );
    }

    const deleted = await client.refund.findUnique({ where: { id } });
    if (!deleted) {
      throw new DatabaseException('Failed to retrieve soft-deleted refund record');
    }
    return deleted;
  }
}
