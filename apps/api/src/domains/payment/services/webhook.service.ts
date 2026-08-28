import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { PaymentWebhookEntity } from '../entities/payment-webhook.entity';
import { WebhookProcessedEvent } from '../events/webhook-processed.event';
import { WebhookReceivedEvent } from '../events/webhook-received.event';
import { IPaymentProviderGateway } from '../interfaces/payment-provider-gateway.interface';
import { PaymentWebhookRepository } from '../repositories/payment-webhook.repository';

/**
 * WebhookService — Production-grade webhook receipt, signature verification, and deduplication.
 *
 * Implements: Replay protection, append-only log, idempotent execution.
 * Architecture ref: Phase 14.0 & Phase 14.3
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly webhookRepo: PaymentWebhookRepository,
    private readonly transactionService: TransactionService,
    private readonly eventBus: EventBusService,
  ) {}

  public async receiveWebhook(
    provider: PaymentProvider,
    signature: string,
    payload: any,
    eventId?: string,
  ): Promise<PaymentWebhookEntity> {
    if (eventId) {
      const existing = await this.webhookRepo.findByEventId(eventId);
      if (existing) {
        this.logger.log(`Webhook event ${eventId} already received. Returning existing log.`);
        return new PaymentWebhookEntity(existing);
      }
    }

    try {
      const created = await this.webhookRepo.create({
        provider,
        eventId,
        signature,
        payload,
        isProcessed: false,
      });

      const entity = new PaymentWebhookEntity(created);

      await this.eventBus.publish(
        new WebhookReceivedEvent({
          webhookLogId: entity.id,
          provider: entity.provider,
          eventId: entity.eventId || undefined,
        }),
      );

      return entity;
    } catch (error: any) {
      if (eventId && (error instanceof ConflictException || error?.code === 'P2002')) {
        const existing = await this.webhookRepo.findByEventId(eventId);
        if (existing) {
          this.logger.log(`Concurrent webhook event ${eventId} absorbed idempotently.`);
          return new PaymentWebhookEntity(existing);
        }
      }
      throw error;
    }
  }

  public async verifySignature(
    rawBody: string | Buffer,
    signature: string,
    gateway: IPaymentProviderGateway,
  ): Promise<boolean> {
    const isValid = await gateway.verifyWebhook(rawBody, signature);
    if (!isValid) {
      this.logger.warn('Incoming webhook failed signature verification');
      throw new ValidationException(
        'Invalid webhook signature header',
      );
    }
    return true;
  }

  public async processWebhook(
    webhookLogId: string,
    handler: (payload: any) => Promise<void>,
  ): Promise<PaymentWebhookEntity> {
    const webhook = await this.webhookRepo.findById(webhookLogId);
    if (!webhook) {
      throw new ResourceNotFoundException(ERROR_CODES.VALIDATION.INVALID_INPUT, `Webhook log ${webhookLogId} not found`);
    }

    if (webhook.isProcessed) {
      this.logger.log(`Webhook log ${webhookLogId} already processed. Skipping.`);
      return new PaymentWebhookEntity(webhook);
    }

    try {
      await handler(webhook.payload);
      const updated = await this.webhookRepo.markProcessed(webhookLogId);
      const entity = new PaymentWebhookEntity(updated);

      await this.eventBus.publish(
        new WebhookProcessedEvent({
          webhookLogId: entity.id,
          provider: entity.provider,
          eventId: entity.eventId || undefined,
          isSuccess: true,
        }),
      );

      return entity;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to process webhook ${webhookLogId}: ${errorMessage}`);
      const updated = await this.webhookRepo.markProcessed(webhookLogId, errorMessage);
      const entity = new PaymentWebhookEntity(updated);

      await this.eventBus.publish(
        new WebhookProcessedEvent({
          webhookLogId: entity.id,
          provider: entity.provider,
          eventId: entity.eventId || undefined,
          isSuccess: false,
          processingError: errorMessage,
        }),
      );

      return entity;
    }
  }

  public async retryWebhook(
    webhookLogId: string,
    handler: (payload: any) => Promise<void>,
  ): Promise<PaymentWebhookEntity> {
    const webhook = await this.webhookRepo.findById(webhookLogId);
    if (!webhook) {
      throw new ResourceNotFoundException(ERROR_CODES.VALIDATION.INVALID_INPUT, `Webhook log ${webhookLogId} not found`);
    }

    return this.processWebhook(webhookLogId, handler);
  }
}
