import { PaymentProvider, RefundStatus } from '@prisma/client';

export class RefundEntity {
  id: string;
  refundCode: string;
  paymentId: string;
  bookingId: string;
  amount: number;
  currency: string;
  reason?: string | null;
  gatewayRefundId?: string | null;
  provider: PaymentProvider;
  status: RefundStatus;
  processedByUserId: string;
  processedAt?: Date | null;
  version: number;
  createdByUserId: string;
  updatedByUserId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  constructor(partial: Partial<RefundEntity>) {
    Object.assign(this, partial);
  }

  public isPending(): boolean {
    return this.status === RefundStatus.PENDING;
  }

  public isProcessing(): boolean {
    return this.status === RefundStatus.PROCESSING;
  }

  public isSuccessful(): boolean {
    return this.status === RefundStatus.SUCCESS;
  }

  public isFailed(): boolean {
    return this.status === RefundStatus.FAILED;
  }

  public remainingRefundable(originalPaidAmount: number, priorRefundsSum: number): number {
    return Math.max(0, originalPaidAmount - priorRefundsSum);
  }
}
