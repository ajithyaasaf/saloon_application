import { Test, TestingModule } from '@nestjs/testing';
import { PaymentProvider, PaymentStatus, RefundStatus } from '@prisma/client';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { PaymentAuditRepository } from '../repositories/payment-audit.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { RefundRepository } from '../repositories/refund.repository';
import { PaymentStatusService } from '../services/payment-status.service';
import { RefundService } from '../services/refund.service';

describe('RefundService', () => {
  let service: RefundService;
  let refundRepo: any;
  let paymentRepo: any;
  let auditRepo: any;

  const mockPayment = {
    id: 'pay_123',
    status: PaymentStatus.PAID,
    amountTotal: 177000,
    amountPaid: 177000,
    amountRefunded: 0,
    amountDue: 0,
    version: 1,
  };

  const mockRefund = {
    id: 'rfd_123',
    refundCode: 'RFD-20260807-B812',
    paymentId: 'pay_123',
    bookingId: 'bk_123',
    amount: 50000,
    provider: PaymentProvider.CASHFREE,
    status: RefundStatus.PENDING,
    processedByUserId: 'usr_123',
    version: 1,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    refundRepo = {
      findById: jest.fn(),
      findByPayment: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    paymentRepo = {
      findById: jest.fn(),
      update: jest.fn(),
    };
    auditRepo = { create: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundService,
        PaymentStatusService,
        { provide: RefundRepository, useValue: refundRepo },
        { provide: PaymentRepository, useValue: paymentRepo },
        { provide: PaymentAuditRepository, useValue: auditRepo },
        { provide: TransactionService, useValue: { run: jest.fn((cb) => cb({})) } },
        { provide: AuditService, useValue: {} },
        { provide: CacheService, useValue: { delete: jest.fn() } },
        { provide: EventBusService, useValue: { publish: jest.fn() } },
      ],
    }).compile();

    service = module.get<RefundService>(RefundService);
  });

  describe('createRefund', () => {
    it('should create refund if amount <= remaining balance', async () => {
      paymentRepo.findById.mockResolvedValue(mockPayment);
      refundRepo.create.mockResolvedValue(mockRefund);

      const res = await service.createRefund(
        {
          paymentId: 'pay_123',
          bookingId: 'bk_123',
          amount: 50000,
          provider: PaymentProvider.CASHFREE,
        },
        'usr_123',
      );

      expect(res.id).toBe(mockRefund.id);
      expect(refundRepo.create).toHaveBeenCalled();
    });

    it('should throw ValidationException if refund amount exceeds paid balance', async () => {
      paymentRepo.findById.mockResolvedValue(mockPayment);

      await expect(
        service.createRefund(
          {
            paymentId: 'pay_123',
            bookingId: 'bk_123',
            amount: 200000, // Exceeds 177000
            provider: PaymentProvider.CASHFREE,
          },
          'usr_123',
        ),
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('processRefund', () => {
    it('should mark refund SUCCESS and update payment amountRefunded', async () => {
      refundRepo.findById.mockResolvedValue(mockRefund);
      paymentRepo.findById.mockResolvedValue(mockPayment);

      refundRepo.update.mockResolvedValue({ ...mockRefund, status: RefundStatus.SUCCESS });
      paymentRepo.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.PARTIALLY_REFUNDED,
        amountRefunded: 50000,
      });

      const res = await service.processRefund('rfd_123', 'cf_rfd_999', 'usr_123');
      expect(res.status).toBe(RefundStatus.SUCCESS);
      expect(paymentRepo.update).toHaveBeenCalled();
    });
  });
});
