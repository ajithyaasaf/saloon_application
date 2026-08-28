import { Injectable, Logger } from '@nestjs/common';
import { Invoice, Prisma } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { IInvoiceRepository } from './interfaces/invoice.repository.interface';

/**
 * InvoiceRepository — Prisma data access for Invoice entity.
 *
 * Soft Delete: Filters `deletedAt IS NULL`.
 * Optimistic Locking: Validates and increments `version`.
 * Uses Indexes: `uq_invoices_number`, `idx_invoices_payment`, `idx_invoices_booking`.
 *
 * Architecture ref: Phase 14.0 & Phase 14.2
 */
@Injectable()
export class InvoiceRepository implements IInvoiceRepository {
  private readonly logger = new Logger(InvoiceRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<Invoice | null> {
    const client = tx ?? this.prisma;
    return client.invoice.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  public async findByInvoiceNumber(invoiceNumber: string, tx?: PrismaTransaction): Promise<Invoice | null> {
    const client = tx ?? this.prisma;
    return client.invoice.findFirst({
      where: {
        invoiceNumber,
        deletedAt: null,
      },
    });
  }

  public async findByPayment(paymentId: string, tx?: PrismaTransaction): Promise<Invoice | null> {
    const client = tx ?? this.prisma;
    return client.invoice.findFirst({
      where: {
        paymentId,
        deletedAt: null,
      },
    });
  }

  public async findByBooking(bookingId: string, tx?: PrismaTransaction): Promise<Invoice | null> {
    const client = tx ?? this.prisma;
    return client.invoice.findFirst({
      where: {
        bookingId,
        deletedAt: null,
      },
    });
  }

  public async create(data: Prisma.InvoiceUncheckedCreateInput, tx?: PrismaTransaction): Promise<Invoice> {
    const client = tx ?? this.prisma;
    try {
      return await client.invoice.create({
        data: {
          ...data,
          version: 1,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          ERROR_CODES.DATABASE.UNIQUE_VIOLATION,
          'Invoice with unique invoice number already exists',
        );
      }
      this.logger.error(`Failed to create invoice: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseException('Failed to create invoice in database');
    }
  }

  public async update(
    id: string,
    expectedVersion: number,
    data: Prisma.InvoiceUncheckedUpdateInput,
    tx?: PrismaTransaction,
  ): Promise<Invoice> {
    const client = tx ?? this.prisma;
    const result = await client.invoice.updateMany({
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
      const existing = await client.invoice.findUnique({ where: { id } });
      if (!existing || existing.deletedAt !== null) {
        throw new DatabaseException('Invoice record not found or soft-deleted');
      }
      throw new ConflictException(
        ERROR_CODES.DATABASE.UNIQUE_VIOLATION,
        `Optimistic lock failed for Invoice ID ${id}. Expected version ${expectedVersion}, found ${existing.version}`,
      );
    }

    const updated = await this.findById(id, tx);
    if (!updated) {
      throw new DatabaseException('Failed to retrieve updated invoice record');
    }
    return updated;
  }

  public async softDelete(id: string, expectedVersion: number, tx?: PrismaTransaction): Promise<Invoice> {
    const client = tx ?? this.prisma;
    const result = await client.invoice.updateMany({
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
      const existing = await client.invoice.findUnique({ where: { id } });
      if (!existing || existing.deletedAt !== null) {
        throw new DatabaseException('Invoice record not found or already deleted');
      }
      throw new ConflictException(
        ERROR_CODES.DATABASE.UNIQUE_VIOLATION,
        `Optimistic lock failed for soft delete on Invoice ID ${id}`,
      );
    }

    const deleted = await client.invoice.findUnique({ where: { id } });
    if (!deleted) {
      throw new DatabaseException('Failed to retrieve soft-deleted invoice record');
    }
    return deleted;
  }
}
