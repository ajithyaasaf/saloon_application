import { InvoiceStatus } from '@prisma/client';

export class InvoiceEntity {
  id: string;
  invoiceNumber: string;
  paymentId: string;
  bookingId: string;
  salonId: string;
  branchId: string;
  customerId: string;
  subtotal: number;
  discount: number;
  cgst: number;
  sgst: number;
  igst: number;
  taxTotal: number;
  grandTotal: number;
  pdfStorageUrl?: string | null;
  status: InvoiceStatus;
  issuedAt?: Date | null;
  version: number;
  createdByUserId: string;
  updatedByUserId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  constructor(partial: Partial<InvoiceEntity>) {
    Object.assign(this, partial);
  }

  public isIssued(): boolean {
    return this.status === InvoiceStatus.ISSUED;
  }

  public isPaid(): boolean {
    return this.status === InvoiceStatus.PAID;
  }

  public isCancelled(): boolean {
    return this.status === InvoiceStatus.CANCELLED || this.status === InvoiceStatus.VOID;
  }
}
