import { PaymentProvider } from '@prisma/client';

export class PaymentWebhookEntity {
  id: string;
  provider: PaymentProvider;
  eventId?: string | null;
  signature: string;
  payload: any;
  isProcessed: boolean;
  processingError?: string | null;
  receivedAt: Date;

  constructor(partial: Partial<PaymentWebhookEntity>) {
    Object.assign(this, partial);
  }

  public isAlreadyProcessed(): boolean {
    return this.isProcessed;
  }

  public hasError(): boolean {
    return !!this.processingError;
  }
}
