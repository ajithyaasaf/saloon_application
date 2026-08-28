import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export interface BookingCancelledPayload {
  bookingId: string;
  bookingCode: string;
  salonId: string;
  branchId: string;
  customerId: string;
  reason?: string | null;
  cancelledByUserId?: string | null;
}

export class BookingCancelledEvent extends BaseDomainEvent<BookingCancelledPayload> {
  constructor(payload: BookingCancelledPayload, actorId?: string, actorRole?: string) {
    super('booking.cancelled.v1', payload.bookingId, 1, payload, undefined, undefined, undefined, {
      actorId,
      actorRole,
    });
  }
}
