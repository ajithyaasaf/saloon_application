import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export interface InvoiceGeneratedPayload {
  invoiceId: string;
  invoiceNumber: string;
  paymentId: string;
  bookingId: string;
  salonId: string;
  branchId: string;
  customerId: string;
  grandTotal: number;
}

export class InvoiceGeneratedEvent extends BaseDomainEvent<InvoiceGeneratedPayload> {
  constructor(payload: InvoiceGeneratedPayload, actorId?: string, actorRole?: string) {
    super('invoice.generated.v1', payload.invoiceId, 1, payload, undefined, undefined, undefined, {
      actorId,
      actorRole,
    });
  }
}
