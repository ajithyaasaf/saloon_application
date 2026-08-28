import { Test, TestingModule } from '@nestjs/testing';
import { PaymentProvider } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PaymentWebhookRepository } from '../repositories/payment-webhook.repository';

describe('PaymentWebhookRepository', () => {
  let repository: PaymentWebhookRepository;
  let prisma: any;

  const mockWebhookLog = {
    id: 'wh_123e4567-e89b-12d3-a456-426614174000',
    provider: PaymentProvider.CASHFREE,
    eventId: 'evt_cf_112233',
    signature: 'sig_hmac_sha256_hash',
    payload: { event: 'PAYMENT_SUCCESS' },
    isProcessed: false,
    processingError: null,
    receivedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      paymentWebhookLog: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentWebhookRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<PaymentWebhookRepository>(PaymentWebhookRepository);
  });

  describe('findByEventId', () => {
    it('should return webhook log by event id', async () => {
      prisma.paymentWebhookLog.findFirst.mockResolvedValue(mockWebhookLog);
      const res = await repository.findByEventId(mockWebhookLog.eventId);
      expect(res).toEqual(mockWebhookLog);
    });
  });

  describe('markProcessed', () => {
    it('should update webhook log to processed', async () => {
      prisma.paymentWebhookLog.update.mockResolvedValue({ ...mockWebhookLog, isProcessed: true });
      const res = await repository.markProcessed(mockWebhookLog.id);
      expect(res.isProcessed).toBe(true);
    });
  });
});
