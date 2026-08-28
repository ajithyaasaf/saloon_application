import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export interface PaymentFailedPayload {
  paymentId: string;
  paymentCode: string;
  bookingId: string;
  reason?: string;
}

export class PaymentFailedEvent extends BaseDomainEvent<PaymentFailedPayload> {
  constructor(payload: PaymentFailedPayload, actorId?: string, actorRole?: string) {
    super('payment.failed.v1', payload.paymentId, 1, payload, undefined, undefined, undefined, {
      actorId,
      actorRole,
    });
  }
}
