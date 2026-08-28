import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export interface PaymentAuthorizedPayload {
  paymentId: string;
  paymentCode: string;
  bookingId: string;
  amount: number;
  providerTransactionId?: string;
}

export class PaymentAuthorizedEvent extends BaseDomainEvent<PaymentAuthorizedPayload> {
  constructor(payload: PaymentAuthorizedPayload, actorId?: string, actorRole?: string) {
    super('payment.authorized.v1', payload.paymentId, 1, payload, undefined, undefined, undefined, {
      actorId,
      actorRole,
    });
  }
}
