import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export interface PaymentExpiredPayload {
  paymentId: string;
  paymentCode: string;
  bookingId: string;
}

export class PaymentExpiredEvent extends BaseDomainEvent<PaymentExpiredPayload> {
  constructor(payload: PaymentExpiredPayload, actorId?: string, actorRole?: string) {
    super('payment.expired.v1', payload.paymentId, 1, payload, undefined, undefined, undefined, {
      actorId,
      actorRole,
    });
  }
}
