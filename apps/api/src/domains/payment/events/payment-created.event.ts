import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export interface PaymentCreatedPayload {
  paymentId: string;
  paymentCode: string;
  bookingId: string;
  salonId: string;
  branchId: string;
  customerId: string;
  amountTotal: number;
  currency: string;
  idempotencyKey: string;
}

export class PaymentCreatedEvent extends BaseDomainEvent<PaymentCreatedPayload> {
  constructor(payload: PaymentCreatedPayload, actorId?: string, actorRole?: string) {
    super('payment.created.v1', payload.paymentId, 1, payload, undefined, undefined, undefined, {
      actorId,
      actorRole,
    });
  }
}
