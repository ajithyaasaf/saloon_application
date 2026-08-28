import { PaymentMethod, PaymentProvider, PaymentStatus, RefundStatus } from '@prisma/client';

export interface CreateGatewayOrderParams {
  paymentId: string;
  paymentCode: string;
  amount: number;
  currency: string;
  customerId: string;
  customerPhone?: string;
  customerEmail?: string;
  idempotencyKey: string;
}

export interface GatewayOrderResult {
  providerOrderReference: string;
  gatewaySessionId?: string;
  paymentUrl?: string;
  rawResponse?: any;
}

export interface GatewayPaymentDetails {
  providerTransactionId: string;
  gatewayReference?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  rawResponse?: any;
}

export interface GatewayRefundParams {
  refundId: string;
  refundCode: string;
  providerTransactionId: string;
  amount: number;
  currency: string;
  reason?: string;
}

export interface GatewayRefundResult {
  gatewayRefundId: string;
  status: RefundStatus;
  rawResponse?: any;
}

export interface IPaymentProviderGateway {
  createOrder(params: CreateGatewayOrderParams): Promise<GatewayOrderResult>;
  fetchPayment(providerTransactionId: string): Promise<GatewayPaymentDetails>;
  capturePayment(providerTransactionId: string, amount: number): Promise<GatewayPaymentDetails>;
  cancelPayment(providerOrderReference: string): Promise<boolean>;
  refundPayment(params: GatewayRefundParams): Promise<GatewayRefundResult>;
  verifyWebhook(rawBody: string | Buffer, signature: string): Promise<boolean>;
}
