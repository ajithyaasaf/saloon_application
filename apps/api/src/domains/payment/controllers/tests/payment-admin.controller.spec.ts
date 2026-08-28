import { Test, TestingModule } from '@nestjs/testing';
import { PaymentMethod, PaymentProvider, PaymentStatus } from '@prisma/client';
import { PaymentEntity } from '../../entities/payment.entity';
import { PaymentService } from '../../services/payment.service';
import { RefundService } from '../../services/refund.service';
import { WebhookService } from '../../services/webhook.service';
import { PaymentAdminController } from '../payment-admin.controller';

describe('PaymentAdminController', () => {
  let controller: PaymentAdminController;
  let paymentService: any;
  let refundService: any;
  let webhookService: any;

  const mockPayment = new PaymentEntity({
    id: '123e4567-e89b-12d3-a456-426614174000',
    paymentCode: 'PAY-20260807-X9A2',
    bookingId: '123e4567-e89b-12d3-a456-426614174001',
    salonId: '123e4567-e89b-12d3-a456-426614174002',
    branchId: '123e4567-e89b-12d3-a456-426614174003',
    customerId: '123e4567-e89b-12d3-a456-426614174004',
    status: PaymentStatus.FAILED,
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

  beforeEach(async () => {
    paymentService = {
      searchPayments: jest.fn(),
    };
    refundService = { getRefundHistory: jest.fn() };
    webhookService = { retryWebhook: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentAdminController],
      providers: [
        { provide: PaymentService, useValue: paymentService },
        { provide: RefundService, useValue: refundService },
        { provide: WebhookService, useValue: webhookService },
      ],
    }).compile();

    controller = module.get<PaymentAdminController>(PaymentAdminController);
  });

  describe('getStatistics', () => {
    it('should return platform payment statistics', async () => {
      const res = await controller.getStatistics();
      expect(res.data.totalVolume).toBeDefined();
    });
  });

  describe('getFailedPayments', () => {
    it('should return list of failed payments', async () => {
      paymentService.searchPayments.mockResolvedValue({
        data: [mockPayment],
        meta: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
      });

      const res = await controller.getFailedPayments({});
      expect(res.data[0].id).toBe(mockPayment.id);
      expect(paymentService.searchPayments).toHaveBeenCalledWith(expect.objectContaining({ status: PaymentStatus.FAILED }));
    });
  });
});
