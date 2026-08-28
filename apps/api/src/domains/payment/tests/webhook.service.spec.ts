import { Test, TestingModule } from '@nestjs/testing';
import { PaymentProvider } from '@prisma/client';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { PaymentWebhookRepository } from '../repositories/payment-webhook.repository';
import { WebhookService } from '../services/webhook.service';

describe('WebhookService', () => {
  let service: WebhookService;
  let webhookRepo: any;

  const mockWebhookLog = {
    id: 'wh_123',
    provider: PaymentProvider.CASHFREE,
    eventId: 'evt_999',
    signature: 'sig_valid',
    payload: { event: 'PAYMENT_SUCCESS' },
    isProcessed: false,
    processingError: null,
    receivedAt: new Date(),
  };

  beforeEach(async () => {
    webhookRepo = {
      findById: jest.fn(),
      findByEventId: jest.fn(),
      create: jest.fn(),
      markProcessed: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: PaymentWebhookRepository, useValue: webhookRepo },
        { provide: TransactionService, useValue: { run: jest.fn((cb) => cb({})) } },
        { provide: EventBusService, useValue: { publish: jest.fn() } },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
  });

  describe('receiveWebhook', () => {
    it('should log incoming webhook if eventId is new', async () => {
      webhookRepo.findByEventId.mockResolvedValue(null);
      webhookRepo.create.mockResolvedValue(mockWebhookLog);

      const res = await service.receiveWebhook(PaymentProvider.CASHFREE, 'sig_valid', { event: 'PAYMENT_SUCCESS' }, 'evt_999');
      expect(res.id).toBe(mockWebhookLog.id);
      expect(webhookRepo.create).toHaveBeenCalled();
    });

    it('should return existing log if eventId already received (deduplication)', async () => {
      webhookRepo.findByEventId.mockResolvedValue(mockWebhookLog);

      const res = await service.receiveWebhook(PaymentProvider.CASHFREE, 'sig_valid', { event: 'PAYMENT_SUCCESS' }, 'evt_999');
      expect(res.id).toBe(mockWebhookLog.id);
      expect(webhookRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('verifySignature', () => {
    it('should pass if gateway signature is valid', async () => {
      const mockGateway = { verifyWebhook: jest.fn().mockResolvedValue(true) } as any;
      const res = await service.verifySignature('raw_body', 'sig_valid', mockGateway);
      expect(res).toBe(true);
    });

    it('should throw ValidationException if gateway signature is invalid', async () => {
      const mockGateway = { verifyWebhook: jest.fn().mockResolvedValue(false) } as any;
      await expect(service.verifySignature('raw_body', 'sig_invalid', mockGateway)).rejects.toThrow(ValidationException);
    });
  });

  describe('processWebhook', () => {
    it('should execute handler and mark processed', async () => {
      webhookRepo.findById.mockResolvedValue(mockWebhookLog);
      webhookRepo.markProcessed.mockResolvedValue({ ...mockWebhookLog, isProcessed: true });

      const handler = jest.fn().mockResolvedValue(undefined);
      const res = await service.processWebhook('wh_123', handler);

      expect(handler).toHaveBeenCalledWith(mockWebhookLog.payload);
      expect(res.isProcessed).toBe(true);
    });
  });
});
