import { PaymentMethod, PaymentProvider, PaymentStatus } from '@prisma/client';
import { InvoiceEntity } from './invoice.entity';
import { PaymentTransactionEntity } from './payment-transaction.entity';
import { RefundEntity } from './refund.entity';

/**
 * PaymentEntity — Pure TypeScript Domain Entity for Payment Aggregate Root.
 * No NestJS, No Prisma, No database coupling.
 */
export class PaymentEntity {
  id: string;
  paymentCode: string;
  bookingId: string;
  salonId: string;
  branchId: string;
  customerId: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  provider: PaymentProvider;
  currency: string;
  amountTotal: number;
  amountPaid: number;
  amountRefunded: number;
  amountDue: number;
  isPartialAllowed: boolean;
  idempotencyKey: string;
  version: number;
  createdByUserId: string;
  updatedByUserId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  transactions?: PaymentTransactionEntity[];
  refunds?: RefundEntity[];
  invoices?: InvoiceEntity[];

  constructor(partial: Partial<PaymentEntity>) {
    Object.assign(this, partial);
  }

  public isPending(): boolean {
    return this.status === PaymentStatus.PENDING;
  }

  public isAuthorized(): boolean {
    return this.status === PaymentStatus.AUTHORIZED;
  }

  public isPaid(): boolean {
    return this.status === PaymentStatus.PAID;
  }

  public isFailed(): boolean {
    return this.status === PaymentStatus.FAILED;
  }

  public isCancelled(): boolean {
    return this.status === PaymentStatus.CANCELLED;
  }

  public isRefunded(): boolean {
    return this.status === PaymentStatus.REFUNDED;
  }

  public isPartiallyRefunded(): boolean {
    return this.status === PaymentStatus.PARTIALLY_REFUNDED;
  }

  public canCapture(): boolean {
    return this.status === PaymentStatus.PENDING || this.status === PaymentStatus.AUTHORIZED;
  }

  public canRefund(): boolean {
    return (
      (this.status === PaymentStatus.PAID || this.status === PaymentStatus.PARTIALLY_REFUNDED) &&
      this.remainingAmount() > 0
    );
  }

  public canCancel(): boolean {
    return this.status === PaymentStatus.UNPAID || this.status === PaymentStatus.PENDING;
  }

  public remainingAmount(): number {
    return Math.max(0, this.amountPaid - this.amountRefunded);
  }
}
