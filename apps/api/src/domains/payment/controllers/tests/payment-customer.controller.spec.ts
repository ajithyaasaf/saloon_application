import { Test, TestingModule } from '@nestjs/testing';
import { PaymentMethod, PaymentProvider, PaymentStatus, RefundStatus } from '@prisma/client';
import { PaymentEntity } from '../../entities/payment.entity';
import { RefundEntity } from '../../entities/refund.entity';
import { InvoiceService } from '../../services/invoice.service';
import { PaymentService } from '../../services/payment.service';
import { RefundService } from '../../services/refund.service';
import { PaymentCustomerController } from '../payment-customer.controller';

describe('PaymentCustomerController', () => {
  let controller: PaymentCustomerController;
  let paymentService: any;
  let refundService: any;
  let invoiceService: any;

  const mockPayment = new PaymentEntity({
    id: '123e4567-e89b-12d3-a456-426614174000',
    paymentCode: 'PAY-20260807-X9A2',
    bookingId: '123e4567-e89b-12d3-a456-426614174001',
    salonId: '123e4567-e89b-12d3-a456-426614174002',
    branchId: '123e4567-e89b-12d3-a456-426614174003',
    customerId: '123e4567-e89b-12d3-a456-426614174004',
    status: PaymentStatus.PENDING,
    paymentMethod: PaymentMethod.UPI,
    provider: PaymentProvider.CASHFREE,
    currency: 'INR',
    amountTotal: 177000,
    amountPaid: 0,
    amountRefunded: 0,
    amountDue: 177000,
    isPartialAllowed: false,
    idempotencyKey: 'idemp_123',
    version: 1,
    createdByUserId: 'usr_123',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mockRefund = new RefundEntity({
    id: '123e4567-e89b-12d3-a456-426614174005',
    refundCode: 'RFD-20260807-B812',
    paymentId: '123e4567-e89b-12d3-a456-426614174000',
    bookingId: '123e4567-e89b-12d3-a456-426614174001',
    amount: 50000,
    provider: PaymentProvider.CASHFREE,
    status: RefundStatus.PENDING,
    processedByUserId: 'usr_123',
    version: 1,
    createdByUserId: 'usr_123',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    paymentService = {
      createPayment: jest.fn(),
      searchPayments: jest.fn(),
      getPayment: jest.fn(),
      cancelPayment: jest.fn(),
    };
    refundService = {
      createRefund: jest.fn(),
      getRefundHistory: jest.fn(),
    };
    invoiceService = {
      downloadInvoice: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentCustomerController],
      providers: [
        { provide: PaymentService, useValue: paymentService },
        { provide: RefundService, useValue: refundService },
        { provide: InvoiceService, useValue: invoiceService },
      ],
    }).compile();

    controller = module.get<PaymentCustomerController>(PaymentCustomerController);
  });

  describe('createPayment', () => {
    it('should create payment and return envelope', async () => {
      paymentService.createPayment.mockResolvedValue(mockPayment);

      const res = await controller.createPayment(
        {
          bookingId: '123e4567-e89b-12d3-a456-426614174001',
          salonId: '123e4567-e89b-12d3-a456-426614174002',
          branchId: '123e4567-e89b-12d3-a456-426614174003',
          customerId: '123e4567-e89b-12d3-a456-426614174004',
          paymentMethod: PaymentMethod.UPI,
          provider: PaymentProvider.CASHFREE,
          amountTotal: 177000,
          idempotencyKey: 'idemp_123',
        },
        '123e4567-e89b-12d3-a456-426614174004',
      );

      expect(res.data.id).toBe(mockPayment.id);
      expect(paymentService.createPayment).toHaveBeenCalled();
    });
  });

  describe('getPaymentById', () => {
    it('should return payment detail if owned by customer', async () => {
      paymentService.getPayment.mockResolvedValue(mockPayment);
      const res = await controller.getPaymentById(mockPayment.id, '123e4567-e89b-12d3-a456-426614174004');
      expect(res.data.id).toBe(mockPayment.id);
    });

    it('should throw ForbiddenOperationException if payment belongs to another customer', async () => {
      paymentService.getPayment.mockResolvedValue(mockPayment);
      await expect(
        controller.getPaymentById(mockPayment.id, 'other_customer_id'),
      ).rejects.toThrow('You are not authorized to view this payment');
    });
  });

  describe('cancelPayment', () => {
    it('should cancel payment if owned by customer', async () => {
      paymentService.getPayment.mockResolvedValue(mockPayment);
      paymentService.cancelPayment.mockResolvedValue(mockPayment);
      const res = await controller.cancelPayment(mockPayment.id, 'Changed mind', '123e4567-e89b-12d3-a456-426614174004');
      expect(res.data.id).toBe(mockPayment.id);
    });

    it('should throw ForbiddenOperationException if cancelling another customer payment', async () => {
      paymentService.getPayment.mockResolvedValue(mockPayment);
      await expect(
        controller.cancelPayment(mockPayment.id, 'Changed mind', 'other_customer_id'),
      ).rejects.toThrow('You are not authorized to cancel this payment');
    });
  });

  describe('getInvoice', () => {
    it('should return download link if owned by customer', async () => {
      paymentService.getPayment.mockResolvedValue(mockPayment);
      invoiceService.downloadInvoice.mockResolvedValue({ invoiceNumber: 'INV-123', pdfStorageUrl: 'https://cdn.example.com/inv.pdf' });
      const res = await controller.getInvoice(mockPayment.id, '123e4567-e89b-12d3-a456-426614174004');
      expect(res.data.pdfStorageUrl).toBe('https://cdn.example.com/inv.pdf');
    });

    it('should throw ForbiddenOperationException if accessing another customer invoice', async () => {
      paymentService.getPayment.mockResolvedValue(mockPayment);
      await expect(
        controller.getInvoice(mockPayment.id, 'other_customer_id'),
      ).rejects.toThrow('You are not authorized to access this invoice');
    });
  });

  describe('requestRefund', () => {
    it('should request refund if payment is owned by customer', async () => {
      paymentService.getPayment.mockResolvedValue(mockPayment);
      refundService.createRefund.mockResolvedValue(mockRefund);

      const res = await controller.requestRefund(
        {
          paymentId: mockPayment.id,
          bookingId: '123e4567-e89b-12d3-a456-426614174001',
          amount: 50000,
          provider: PaymentProvider.CASHFREE,
        },
        '123e4567-e89b-12d3-a456-426614174004',
      );

      expect(res.data.id).toBe(mockRefund.id);
    });

    it('should throw ForbiddenOperationException if requesting refund for another customer payment', async () => {
      paymentService.getPayment.mockResolvedValue(mockPayment);
      await expect(
        controller.requestRefund(
          {
            paymentId: mockPayment.id,
            bookingId: '123e4567-e89b-12d3-a456-426614174001',
            amount: 50000,
            provider: PaymentProvider.CASHFREE,
          },
          'other_customer_id',
        ),
      ).rejects.toThrow('You are not authorized to request a refund for this payment');
    });
  });

  describe('getRefunds', () => {
    it('should get refunds if payment is owned by customer', async () => {
      paymentService.getPayment.mockResolvedValue(mockPayment);
      refundService.getRefundHistory.mockResolvedValue([mockRefund]);
      const res = await controller.getRefunds(mockPayment.id, '123e4567-e89b-12d3-a456-426614174004');
      expect(res.data).toHaveLength(1);
    });

    it('should throw ForbiddenOperationException if querying refunds for another customer payment', async () => {
      paymentService.getPayment.mockResolvedValue(mockPayment);
      await expect(
        controller.getRefunds(mockPayment.id, 'other_customer_id'),
      ).rejects.toThrow('You are not authorized to view refunds for this payment');
    });
  });
});
