import { Injectable, Logger } from '@nestjs/common';
import { PaymentTransaction, Prisma } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { IPaymentTransactionRepository } from './interfaces/payment-transaction.repository.interface';

/**
 * PaymentTransactionRepository — Prisma data access for PaymentTransaction model.
 *
 * Uses Indexes: `idx_payment_transactions_payment`, `idx_payment_transactions_provider_tx_id`,
 *               `idx_payment_transactions_gateway_ref`, `idx_payment_transactions_status`.
 *
 * Architecture ref: Phase 14.0 & Phase 14.2
 */
@Injectable()
export class PaymentTransactionRepository implements IPaymentTransactionRepository {
  private readonly logger = new Logger(PaymentTransactionRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<PaymentTransaction | null> {
    const client = tx ?? this.prisma;
    return client.paymentTransaction.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  public async findByPayment(paymentId: string, tx?: PrismaTransaction): Promise<PaymentTransaction[]> {
    const client = tx ?? this.prisma;
    return client.paymentTransaction.findMany({
      where: {
        paymentId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findByProviderTransactionId(providerTransactionId: string, tx?: PrismaTransaction): Promise<PaymentTransaction | null> {
    const client = tx ?? this.prisma;
    return client.paymentTransaction.findFirst({
      where: {
        providerTransactionId,
        deletedAt: null,
      },
    });
  }

  public async findByGatewayReference(gatewayReference: string, tx?: PrismaTransaction): Promise<PaymentTransaction[]> {
    const client = tx ?? this.prisma;
    return client.paymentTransaction.findMany({
      where: {
        gatewayReference,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async create(data: Prisma.PaymentTransactionUncheckedCreateInput, tx?: PrismaTransaction): Promise<PaymentTransaction> {
    const client = tx ?? this.prisma;
    try {
      return await client.paymentTransaction.create({
        data: {
          ...data,
          version: 1,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          ERROR_CODES.DATABASE.UNIQUE_VIOLATION,
          'Payment transaction with unique providerTransactionId already exists',
        );
      }
      this.logger.error(`Failed to create payment transaction: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseException('Failed to create payment transaction in database');
    }
  }

  public async update(
    id: string,
    expectedVersion: number,
    data: Prisma.PaymentTransactionUncheckedUpdateInput,
    tx?: PrismaTransaction,
  ): Promise<PaymentTransaction> {
    const client = tx ?? this.prisma;
    const result = await client.paymentTransaction.updateMany({
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
      const existing = await client.paymentTransaction.findUnique({ where: { id } });
      if (!existing || existing.deletedAt !== null) {
        throw new DatabaseException('PaymentTransaction record not found or soft-deleted');
      }
      throw new ConflictException(
        ERROR_CODES.DATABASE.UNIQUE_VIOLATION,
        `Optimistic lock failed for PaymentTransaction ID ${id}. Expected version ${expectedVersion}, found ${existing.version}`,
      );
    }

    const updated = await this.findById(id, tx);
    if (!updated) {
      throw new DatabaseException('Failed to retrieve updated payment transaction');
    }
    return updated;
  }
}
