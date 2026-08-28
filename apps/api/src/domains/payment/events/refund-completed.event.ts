import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export interface RefundCompletedPayload {
  refundId: string;
  refundCode: string;
  paymentId: string;
  bookingId: string;
  amount: number;
  gatewayRefundId?: string;
}

export class RefundCompletedEvent extends BaseDomainEvent<RefundCompletedPayload> {
  constructor(payload: RefundCompletedPayload, actorId?: string, actorRole?: string) {
    super('refund.completed.v1', payload.refundId, 1, payload, undefined, undefined, undefined, {
      actorId,
      actorRole,
    });
  }
}
