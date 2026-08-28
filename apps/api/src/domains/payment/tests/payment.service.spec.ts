import { Test, TestingModule } from '@nestjs/testing';
import { PaymentMethod, PaymentProvider, PaymentStatus } from '@prisma/client';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { NotificationService } from '../../../shared/notification/notification.service';
import { QueueService } from '../../../shared/queue/queue.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { PaymentAuditRepository } from '../repositories/payment-audit.repository';
import { PaymentTransactionRepository } from '../repositories/payment-transaction.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentStatusService } from '../services/payment-status.service';
import { PaymentService } from '../services/payment.service';

describe('PaymentService', () => {
  let service: PaymentService;
  let paymentRepo: any;
  let transactionRepo: any;
  let auditRepo: any;

  const mockPayment = {
    id: 'pay_123',
    paymentCode: 'PAY-20260807-X9A2',
    bookingId: 'bk_123',
    salonId: 'sal_123',
    branchId: 'br_123',
    customerId: 'usr_123',
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
  };

  beforeEach(async () => {
    paymentRepo = {
      findById: jest.fn(),
      findByIdempotencyKey: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      search: jest.fn(),
    };
    transactionRepo = { create: jest.fn() };
    auditRepo = { create: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        PaymentStatusService,
        { provide: PaymentRepository, useValue: paymentRepo },
        { provide: PaymentTransactionRepository, useValue: transactionRepo },
        { provide: PaymentAuditRepository, useValue: auditRepo },
        { provide: TransactionService, useValue: { run: jest.fn((cb) => cb({})) } },
        { provide: AuditService, useValue: {} },
        { provide: CacheService, useValue: { delete: jest.fn(), getOrSet: jest.fn((key, ttl, fn) => fn()) } },
        { provide: EventBusService, useValue: { publish: jest.fn() } },
        { provide: NotificationService, useValue: {} },
        { provide: QueueService, useValue: {} },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  describe('createPayment', () => {
    it('should create a new payment if idempotency key does not exist', async () => {
      paymentRepo.findByIdempotencyKey.mockResolvedValue(null);
      paymentRepo.create.mockResolvedValue(mockPayment);

      const res = await service.createPayment(
        {
          bookingId: 'bk_123',
          salonId: 'sal_123',
          branchId: 'br_123',
          customerId: 'usr_123',
          paymentMethod: PaymentMethod.UPI,
          provider: PaymentProvider.CASHFREE,
          amountTotal: 177000,
          idempotencyKey: 'idemp_123',
        },
        'usr_123',
      );

      expect(res.id).toBe(mockPayment.id);
      expect(paymentRepo.create).toHaveBeenCalled();
    });

    it('should return existing payment if idempotency key exists', async () => {
      paymentRepo.findByIdempotencyKey.mockResolvedValue(mockPayment);

      const res = await service.createPayment(
        {
          bookingId: 'bk_123',
          salonId: 'sal_123',
          branchId: 'br_123',
          customerId: 'usr_123',
          paymentMethod: PaymentMethod.UPI,
          provider: PaymentProvider.CASHFREE,
          amountTotal: 177000,
          idempotencyKey: 'idemp_123',
        },
        'usr_123',
      );

      expect(res.id).toBe(mockPayment.id);
      expect(paymentRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('capturePayment', () => {
    it('should transition to PAID when full amount is captured', async () => {
      paymentRepo.findById.mockResolvedValue(mockPayment);
      paymentRepo.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.PAID,
        amountPaid: 177000,
        amountDue: 0,
      });

      const res = await service.capturePayment('pay_123', 177000, 'cf_pay_999', 'usr_123');
      expect(res.status).toBe(PaymentStatus.PAID);
      expect(paymentRepo.update).toHaveBeenCalled();
    });

    it('should throw ResourceNotFoundException if payment does not exist', async () => {
      paymentRepo.findById.mockResolvedValue(null);
      await expect(service.capturePayment('invalid_id', 177000, 'cf_pay_999', 'usr_123')).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('cancelPayment', () => {
    it('should cancel a PENDING payment', async () => {
      paymentRepo.findById.mockResolvedValue(mockPayment);
      paymentRepo.update.mockResolvedValue({ ...mockPayment, status: PaymentStatus.CANCELLED });

      const res = await service.cancelPayment('pay_123', 'User cancelled', 'usr_123');
      expect(res.status).toBe(PaymentStatus.CANCELLED);
    });
  });
});
