import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export interface ReservationCreatedPayload {
  lockId: string;
  lockKey: string;
  branchId: string;
  staffId: string;
  customerId: string;
  startTime: Date;
  endTime: Date;
  expiresAt: Date;
}

export class ReservationCreatedEvent extends BaseDomainEvent<ReservationCreatedPayload> {
  constructor(payload: ReservationCreatedPayload) {
    super('reservation.created.v1', payload.lockId, 1, payload);
  }
}
