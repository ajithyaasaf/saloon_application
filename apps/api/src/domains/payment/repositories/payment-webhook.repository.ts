import { Injectable, Logger } from '@nestjs/common';
import { PaymentWebhookLog, Prisma } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { IPaymentWebhookRepository } from './interfaces/payment-webhook.repository.interface';

/**
 * PaymentWebhookRepository — Prisma data access for PaymentWebhookLog append-only model.
 *
 * Uses Indexes: `uq_payment_webhook_logs_event_id`, `idx_payment_webhook_logs_provider`,
 *               `idx_payment_webhook_logs_is_processed`, `idx_payment_webhook_logs_received_at`.
 *
 * Architecture ref: Phase 14.0 & Phase 14.2
 */
@Injectable()
export class PaymentWebhookRepository implements IPaymentWebhookRepository {
  private readonly logger = new Logger(PaymentWebhookRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<PaymentWebhookLog | null> {
    const client = tx ?? this.prisma;
    return client.paymentWebhookLog.findUnique({ where: { id } });
  }

  public async findByEventId(eventId: string, tx?: PrismaTransaction): Promise<PaymentWebhookLog | null> {
    const client = tx ?? this.prisma;
    return client.paymentWebhookLog.findFirst({ where: { eventId } });
  }

  public async findUnprocessed(limit: number = 50, tx?: PrismaTransaction): Promise<PaymentWebhookLog[]> {
    const client = tx ?? this.prisma;
    return client.paymentWebhookLog.findMany({
      where: { isProcessed: false },
      take: limit,
      orderBy: { receivedAt: 'asc' },
    });
  }

  public async create(data: Prisma.PaymentWebhookLogUncheckedCreateInput, tx?: PrismaTransaction): Promise<PaymentWebhookLog> {
    const client = tx ?? this.prisma;
    try {
      return await client.paymentWebhookLog.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          ERROR_CODES.DATABASE.UNIQUE_VIOLATION,
          'Webhook event with this eventId already logged',
        );
      }
      this.logger.error(`Failed to create webhook log: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseException('Failed to create payment webhook log');
    }
  }

  public async markProcessed(id: string, processingError?: string, tx?: PrismaTransaction): Promise<PaymentWebhookLog> {
    const client = tx ?? this.prisma;
    return client.paymentWebhookLog.update({
      where: { id },
      data: {
        isProcessed: true,
        processingError: processingError ?? null,
      },
    });
  }
}
