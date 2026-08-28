import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export interface BookingCompletedPayload {
  bookingId: string;
  bookingCode: string;
  salonId: string;
  branchId: string;
  customerId: string;
  completedAt: Date;
}

export class BookingCompletedEvent extends BaseDomainEvent<BookingCompletedPayload> {
  constructor(payload: BookingCompletedPayload, actorId?: string, actorRole?: string) {
    super('booking.completed.v1', payload.bookingId, 1, payload, undefined, undefined, undefined, {
      actorId,
      actorRole,
    });
  }
}
