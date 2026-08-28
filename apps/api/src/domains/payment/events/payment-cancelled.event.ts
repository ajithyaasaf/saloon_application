import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export interface PaymentCancelledPayload {
  paymentId: string;
  paymentCode: string;
  bookingId: string;
  reason?: string;
}

export class PaymentCancelledEvent extends BaseDomainEvent<PaymentCancelledPayload> {
  constructor(payload: PaymentCancelledPayload, actorId?: string, actorRole?: string) {
    super('payment.cancelled.v1', payload.paymentId, 1, payload, undefined, undefined, undefined, {
      actorId,
      actorRole,
    });
  }
}
