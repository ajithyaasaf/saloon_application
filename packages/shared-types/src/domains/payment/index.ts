import { InvoiceStatus, PaymentMethod, PaymentStatus, RefundStatus } from '../../enums/index.js';

export interface InvoiceLineItemDto {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface InvoiceDto {
  id: string;
  invoiceNumber: string;
  bookingId?: string | null;
  customerId: string;
  salonId: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  status: InvoiceStatus;
  lineItems: InvoiceLineItemDto[];
  issuedAt: string;
  paidAt?: string | null;
  pdfUrl?: string | null;
}

export interface PaymentDto {
  id: string;
  invoiceId: string;
  bookingId?: string | null;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  gatewayOrderId?: string | null;
  gatewayPaymentId?: string | null;
  paidAt?: string | null;
  createdAt: string;
}

export interface RazorpayOrderDto {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface InitiatePaymentRequestDto {
  bookingId: string;
  paymentMethod: PaymentMethod;
}

export interface VerifyPaymentRequestDto {
  paymentId: string;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
}

export interface RefundRequestDto {
  paymentId: string;
  amount?: number;
  reason: string;
}

export interface RefundDto {
  id: string;
  paymentId: string;
  amount: number;
  status: RefundStatus;
  reason: string;
  gatewayRefundId?: string | null;
  processedAt?: string | null;
  createdAt: string;
}

export type PaymentIntentDto = InitiatePaymentRequestDto;
export interface PaymentMethodDto {
  method: PaymentMethod;
  name: string;
  isAvailable: boolean;
}
