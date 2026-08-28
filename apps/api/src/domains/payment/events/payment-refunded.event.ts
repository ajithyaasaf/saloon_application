import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export interface PaymentRefundedPayload {
  paymentId: string;
  paymentCode: string;
  bookingId: string;
  amountRefunded: number;
  isFullyRefunded: boolean;
}

export class PaymentRefundedEvent extends BaseDomainEvent<PaymentRefundedPayload> {
  constructor(payload: PaymentRefundedPayload, actorId?: string, actorRole?: string) {
    super('payment.refunded.v1', payload.paymentId, 1, payload, undefined, undefined, undefined, {
      actorId,
      actorRole,
    });
  }
}
