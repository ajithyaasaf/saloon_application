import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export interface ReservationReleasedPayload {
  lockKey: string;
  releasedAt: Date;
  reason?: string;
}

export class ReservationReleasedEvent extends BaseDomainEvent<ReservationReleasedPayload> {
  constructor(payload: ReservationReleasedPayload) {
    super('reservation.released.v1', payload.lockKey, 1, payload);
  }
}
