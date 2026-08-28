import { PaymentProvider } from '@prisma/client';
import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export interface WebhookProcessedPayload {
  webhookLogId: string;
  provider: PaymentProvider;
  eventId?: string;
  isSuccess: boolean;
  processingError?: string;
}

export class WebhookProcessedEvent extends BaseDomainEvent<WebhookProcessedPayload> {
  constructor(payload: WebhookProcessedPayload, actorId?: string, actorRole?: string) {
    super('webhook.processed.v1', payload.webhookLogId, 1, payload, undefined, undefined, undefined, {
      actorId,
      actorRole,
    });
  }
}
