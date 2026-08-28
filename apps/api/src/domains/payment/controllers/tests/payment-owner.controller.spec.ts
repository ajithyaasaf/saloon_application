import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceStatus, PaymentMethod, PaymentProvider, PaymentStatus, RefundStatus } from '@prisma/client';
import { InvoiceEntity } from '../../entities/invoice.entity';
import { PaymentEntity } from '../../entities/payment.entity';
import { RefundEntity } from '../../entities/refund.entity';
import { InvoiceService } from '../../services/invoice.service';
import { PaymentService } from '../../services/payment.service';
import { RefundService } from '../../services/refund.service';
import { WebhookService } from '../../services/webhook.service';
import { PaymentOwnerController } from '../payment-owner.controller';

describe('PaymentOwnerController', () => {
  let controller: PaymentOwnerController;
  let paymentService: any;
  let refundService: any;
  let invoiceService: any;
  let webhookService: any;

  const mockPayment = new PaymentEntity({
    id: '123e4567-e89b-12d3-a456-426614174000',
    paymentCode: 'PAY-20260807-X9A2',
    bookingId: '123e4567-e89b-12d3-a456-426614174001',
    salonId: '123e4567-e89b-12d3-a456-426614174002',
    branchId: '123e4567-e89b-12d3-a456-426614174003',
    customerId: '123e4567-e89b-12d3-a456-426614174004',
    status: PaymentStatus.PAID,
    paymentMethod: PaymentMethod.UPI,
    provider: PaymentProvider.CASHFREE,
    currency: 'INR',
    amountTotal: 177000,
    amountPaid: 177000,
    amountRefunded: 0,
    amountDue: 0,
    isPartialAllowed: false,
    idempotencyKey: 'idemp_123',
    version: 1,
    createdByUserId: 'usr_123',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mockInvoice = new InvoiceEntity({
    id: '123e4567-e89b-12d3-a456-426614174006',
    invoiceNumber: 'INV-BR123-2026-0042',
    paymentId: mockPayment.id,
    bookingId: '123e4567-e89b-12d3-a456-426614174001',
    salonId: '123e4567-e89b-12d3-a456-426614174002',
    branchId: '123e4567-e89b-12d3-a456-426614174003',
    customerId: '123e4567-e89b-12d3-a456-426614174004',
    subtotal: 150000,
    discount: 0,
    cgst: 13500,
    sgst: 13500,
    igst: 0,
    taxTotal: 27000,
    grandTotal: 177000,
    status: InvoiceStatus.DRAFT,
    version: 1,
    createdByUserId: 'usr_123',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    paymentService = {
      searchPayments: jest.fn(),
      getPayment: jest.fn(),
      authorizePayment: jest.fn(),
      capturePayment: jest.fn(),
      expirePayment: jest.fn(),
    };
    refundService = { createRefund: jest.fn() };
    invoiceService = { generateInvoice: jest.fn(), issueInvoice: jest.fn() };
    webhookService = { processWebhook: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentOwnerController],
      providers: [
        { provide: PaymentService, useValue: paymentService },
        { provide: RefundService, useValue: refundService },
        { provide: InvoiceService, useValue: invoiceService },
        { provide: WebhookService, useValue: webhookService },
      ],
    }).compile();

    controller = module.get<PaymentOwnerController>(PaymentOwnerController);
  });

  describe('capturePayment', () => {
    it('should capture payment', async () => {
      paymentService.capturePayment.mockResolvedValue(mockPayment);

      const res = await controller.capturePayment(mockPayment.id, 177000, 'cf_pay_999', 'usr_123');
      expect(res.data.id).toBe(mockPayment.id);
      expect(paymentService.capturePayment).toHaveBeenCalledWith(mockPayment.id, 177000, 'cf_pay_999', 'usr_123');
    });
  });

  describe('generateInvoice', () => {
    it('should generate tax invoice', async () => {
      invoiceService.generateInvoice.mockResolvedValue(mockInvoice);

      const res = await controller.generateInvoice(
        {
          paymentId: mockPayment.id,
          bookingId: '123e4567-e89b-12d3-a456-426614174001',
          salonId: '123e4567-e89b-12d3-a456-426614174002',
          branchId: '123e4567-e89b-12d3-a456-426614174003',
          customerId: '123e4567-e89b-12d3-a456-426614174004',
          subtotal: 150000,
          grandTotal: 177000,
        },
        'usr_123',
      );

      expect(res.data.id).toBe(mockInvoice.id);
    });
  });
});
