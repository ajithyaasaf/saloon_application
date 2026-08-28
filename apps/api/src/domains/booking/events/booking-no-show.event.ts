import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export interface BookingNoShowPayload {
  bookingId: string;
  bookingCode: string;
  salonId: string;
  branchId: string;
  customerId: string;
  reason?: string | null;
}

export class BookingNoShowEvent extends BaseDomainEvent<BookingNoShowPayload> {
  constructor(payload: BookingNoShowPayload, actorId?: string, actorRole?: string) {
    super('booking.no-show.v1', payload.bookingId, 1, payload, undefined, undefined, undefined, {
      actorId,
      actorRole,
    });
  }
}
