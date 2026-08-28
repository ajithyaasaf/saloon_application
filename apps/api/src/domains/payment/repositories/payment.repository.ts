import { Injectable, Logger } from '@nestjs/common';
import { Payment, PaymentStatus, Prisma } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PaginationMeta } from '../../../common/types/pagination.type';
import { PaginationUtil } from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { SearchPaymentQueryDto } from '../dto/search-payment-query.dto';
import { IPaymentRepository } from './interfaces/payment.repository.interface';

/**
 * PaymentRepository — Prisma data access for Payment aggregate root.
 *
 * Soft Delete: Filters `deletedAt IS NULL`.
 * Optimistic Locking: Validates and increments `version`.
 * Uses Indexes: `uq_payments_code`, `uq_payments_idempotency_key`, `idx_payments_booking`,
 *               `idx_payments_salon`, `idx_payments_branch`, `idx_payments_customer`, `idx_payments_status`, `idx_payments_provider`.
 *
 * Architecture ref: Phase 14.0 & Phase 14.2
 */
@Injectable()
export class PaymentRepository implements IPaymentRepository {
  private readonly logger = new Logger(PaymentRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<Payment | null> {
    const client = tx ?? this.prisma;
    return client.payment.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        transactions: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        },
        refunds: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        },
        invoices: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  public async findByPaymentCode(code: string, tx?: PrismaTransaction): Promise<Payment | null> {
    const client = tx ?? this.prisma;
    return client.payment.findFirst({
      where: {
        paymentCode: code,
        deletedAt: null,
      },
      include: {
        transactions: { where: { deletedAt: null } },
        refunds: { where: { deletedAt: null } },
        invoices: { where: { deletedAt: null } },
      },
    });
  }

  public async findByBooking(bookingId: string, tx?: PrismaTransaction): Promise<Payment | null> {
    const client = tx ?? this.prisma;
    return client.payment.findFirst({
      where: {
        bookingId,
        deletedAt: null,
      },
      include: {
        transactions: { where: { deletedAt: null } },
        refunds: { where: { deletedAt: null } },
        invoices: { where: { deletedAt: null } },
      },
    });
  }

  public async findByCustomer(
    customerId: string,
    query?: SearchPaymentQueryDto,
    tx?: PrismaTransaction,
  ): Promise<{ data: Payment[]; meta: PaginationMeta }> {
    return this.search({ ...query, customerId }, tx);
  }

  public async findBySalon(
    salonId: string,
    query?: SearchPaymentQueryDto,
    tx?: PrismaTransaction,
  ): Promise<{ data: Payment[]; meta: PaginationMeta }> {
    return this.search({ ...query, salonId }, tx);
  }

  public async findByBranch(
    branchId: string,
    query?: SearchPaymentQueryDto,
    tx?: PrismaTransaction,
  ): Promise<{ data: Payment[]; meta: PaginationMeta }> {
    return this.search({ ...query, branchId }, tx);
  }

  public async findByStatus(
    status: PaymentStatus,
    query?: SearchPaymentQueryDto,
    tx?: PrismaTransaction,
  ): Promise<{ data: Payment[]; meta: PaginationMeta }> {
    return this.search({ ...query, status }, tx);
  }

  public async findByIdempotencyKey(key: string, tx?: PrismaTransaction): Promise<Payment | null> {
    const client = tx ?? this.prisma;
    return client.payment.findFirst({
      where: {
        idempotencyKey: key,
        deletedAt: null,
      },
    });
  }

  public async search(
    query: SearchPaymentQueryDto = {},
    tx?: PrismaTransaction,
  ): Promise<{ data: Payment[]; meta: PaginationMeta }> {
    const client = tx ?? this.prisma;
    const normParams = PaginationUtil.normalizeParams(query.page, query.limit);
    const { skip, take } = PaginationUtil.getSkipTake(normParams);

    const where: Prisma.PaymentWhereInput = {
      deletedAt: null,
      ...(query.salonId ? { salonId: query.salonId } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.bookingId ? { bookingId: query.bookingId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.provider ? { provider: query.provider } : {}),
      ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
      ...(query.search
        ? {
            OR: [
              { paymentCode: { contains: query.search, mode: 'insensitive' } },
              { idempotencyKey: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      client.payment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      client.payment.count({ where }),
    ]);

    const meta = PaginationUtil.buildMeta(total, normParams);
    return { data, meta };
  }

  public async count(where?: Prisma.PaymentWhereInput, tx?: PrismaTransaction): Promise<number> {
    const client = tx ?? this.prisma;
    return client.payment.count({
      where: {
        deletedAt: null,
        ...where,
      },
    });
  }

  public async create(data: Prisma.PaymentUncheckedCreateInput, tx?: PrismaTransaction): Promise<Payment> {
    const client = tx ?? this.prisma;
    try {
      return await client.payment.create({
        data: {
          ...data,
          version: 1,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          ERROR_CODES.DATABASE.UNIQUE_VIOLATION,
          'Payment with unique code or idempotency key already exists',
        );
      }
      this.logger.error(`Failed to create payment: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseException('Failed to create payment in database');
    }
  }

  public async update(
    id: string,
    expectedVersion: number,
    data: Prisma.PaymentUncheckedUpdateInput,
    tx?: PrismaTransaction,
  ): Promise<Payment> {
    const client = tx ?? this.prisma;
    const result = await client.payment.updateMany({
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
      const existing = await client.payment.findUnique({ where: { id } });
      if (!existing || existing.deletedAt !== null) {
        throw new DatabaseException('Payment record not found or has been soft-deleted');
      }
      throw new ConflictException(
        ERROR_CODES.DATABASE.UNIQUE_VIOLATION,
        `Optimistic lock failed for Payment ID ${id}. Expected version ${expectedVersion}, found ${existing.version}`,
      );
    }

    const updated = await this.findById(id, tx);
    if (!updated) {
      throw new DatabaseException('Failed to retrieve updated payment record');
    }
    return updated;
  }

  public async softDelete(id: string, expectedVersion: number, tx?: PrismaTransaction): Promise<Payment> {
    const client = tx ?? this.prisma;
    const result = await client.payment.updateMany({
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
      const existing = await client.payment.findUnique({ where: { id } });
      if (!existing || existing.deletedAt !== null) {
        throw new DatabaseException('Payment record not found or already deleted');
      }
      throw new ConflictException(
        ERROR_CODES.DATABASE.UNIQUE_VIOLATION,
        `Optimistic lock failed for soft delete on Payment ID ${id}`,
      );
    }

    const deleted = await client.payment.findUnique({ where: { id } });
    if (!deleted) {
      throw new DatabaseException('Failed to retrieve soft-deleted payment record');
    }
    return deleted;
  }
}
