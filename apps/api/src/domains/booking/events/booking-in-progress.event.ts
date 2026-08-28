import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export interface BookingInProgressPayload {
  bookingId: string;
  bookingCode: string;
  salonId: string;
  branchId: string;
  customerId: string;
  startedAt: Date;
}

export class BookingInProgressEvent extends BaseDomainEvent<BookingInProgressPayload> {
  constructor(payload: BookingInProgressPayload, actorId?: string, actorRole?: string) {
    super('booking.in-progress.v1', payload.bookingId, 1, payload, undefined, undefined, undefined, {
      actorId,
      actorRole,
    });
  }
}
