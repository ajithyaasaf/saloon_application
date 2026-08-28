import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export interface BookingExpiredPayload {
  bookingId: string;
  bookingCode: string;
  salonId: string;
  branchId: string;
  customerId: string;
  expiredAt: Date;
}

export class BookingExpiredEvent extends BaseDomainEvent<BookingExpiredPayload> {
  constructor(payload: BookingExpiredPayload) {
    super('booking.expired.v1', payload.bookingId, 1, payload);
  }
}
