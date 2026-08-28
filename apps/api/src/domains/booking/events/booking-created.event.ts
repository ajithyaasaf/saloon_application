import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export interface BookingCreatedPayload {
  bookingId: string;
  bookingCode: string;
  salonId: string;
  branchId: string;
  customerId: string;
  totalAmount: number;
  currency: string;
  bookingDate: Date;
  startTime: Date;
  endTime: Date;
}

export class BookingCreatedEvent extends BaseDomainEvent<BookingCreatedPayload> {
  constructor(payload: BookingCreatedPayload, actorId?: string, actorRole?: string) {
    super('booking.created.v1', payload.bookingId, 1, payload, undefined, undefined, undefined, {
      actorId,
      actorRole,
    });
  }
}
