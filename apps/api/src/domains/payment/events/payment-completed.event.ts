import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export interface PaymentCompletedPayload {
  paymentId: string;
  paymentCode: string;
  bookingId: string;
  salonId: string;
  branchId: string;
  customerId: string;
  amountPaid: number;
  currency: string;
}

export class PaymentCompletedEvent extends BaseDomainEvent<PaymentCompletedPayload> {
  constructor(payload: PaymentCompletedPayload, actorId?: string, actorRole?: string) {
    super('payment.completed.v1', payload.paymentId, 1, payload, undefined, undefined, undefined, {
      actorId,
      actorRole,
    });
  }
}
