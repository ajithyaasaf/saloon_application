import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export interface BookingCheckedInPayload {
  bookingId: string;
  bookingCode: string;
  salonId: string;
  branchId: string;
  customerId: string;
  checkedInAt: Date;
}

export class BookingCheckedInEvent extends BaseDomainEvent<BookingCheckedInPayload> {
  constructor(payload: BookingCheckedInPayload, actorId?: string, actorRole?: string) {
    super('booking.checked-in.v1', payload.bookingId, 1, payload, undefined, undefined, undefined, {
      actorId,
      actorRole,
    });
  }
}
