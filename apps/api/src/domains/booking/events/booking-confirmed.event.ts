import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export interface BookingConfirmedPayload {
  bookingId: string;
  bookingCode: string;
  salonId: string;
  branchId: string;
  customerId: string;
  paymentId?: string | null;
}

export class BookingConfirmedEvent extends BaseDomainEvent<BookingConfirmedPayload> {
  constructor(payload: BookingConfirmedPayload, actorId?: string, actorRole?: string) {
    super('booking.confirmed.v1', payload.bookingId, 1, payload, undefined, undefined, undefined, {
      actorId,
      actorRole,
    });
  }
}
