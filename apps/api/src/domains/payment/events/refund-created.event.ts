import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export interface RefundCreatedPayload {
  refundId: string;
  refundCode: string;
  paymentId: string;
  bookingId: string;
  amount: number;
}

export class RefundCreatedEvent extends BaseDomainEvent<RefundCreatedPayload> {
  constructor(payload: RefundCreatedPayload, actorId?: string, actorRole?: string) {
    super('refund.created.v1', payload.refundId, 1, payload, undefined, undefined, undefined, {
      actorId,
      actorRole,
    });
  }
}
