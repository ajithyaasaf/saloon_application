import { PaymentMethod, PaymentProvider, PaymentStatus } from '@prisma/client';

export class PaymentTransactionEntity {
  id: string;
  paymentId: string;
  providerTransactionId?: string | null;
  gatewayReference?: string | null;
  authorizationReference?: string | null;
  paymentMethod: PaymentMethod;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  requestPayload?: any;
  responsePayload?: any;
  status: PaymentStatus;
  processedAt?: Date | null;
  version: number;
  createdByUserId: string;
  updatedByUserId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  constructor(partial: Partial<PaymentTransactionEntity>) {
    Object.assign(this, partial);
  }

  public isSuccessful(): boolean {
    return this.status === PaymentStatus.PAID;
  }

  public isFailed(): boolean {
    return this.status === PaymentStatus.FAILED;
  }

  public isAuthorized(): boolean {
    return this.status === PaymentStatus.AUTHORIZED;
  }
}
