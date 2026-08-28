import { PaymentProvider } from '@prisma/client';
import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export interface WebhookReceivedPayload {
  webhookLogId: string;
  provider: PaymentProvider;
  eventId?: string;
}

export class WebhookReceivedEvent extends BaseDomainEvent<WebhookReceivedPayload> {
  constructor(payload: WebhookReceivedPayload, actorId?: string, actorRole?: string) {
    super('webhook.received.v1', payload.webhookLogId, 1, payload, undefined, undefined, undefined, {
      actorId,
      actorRole,
    });
  }
}
