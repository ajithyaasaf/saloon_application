import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

export interface InvoiceIssuedPayload {
  invoiceId: string;
  invoiceNumber: string;
  paymentId: string;
  bookingId: string;
  pdfStorageUrl?: string;
}

export class InvoiceIssuedEvent extends BaseDomainEvent<InvoiceIssuedPayload> {
  constructor(payload: InvoiceIssuedPayload, actorId?: string, actorRole?: string) {
    super('invoice.issued.v1', payload.invoiceId, 1, payload, undefined, undefined, undefined, {
      actorId,
      actorRole,
    });
  }
}
