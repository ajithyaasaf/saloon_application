import { Test, TestingModule } from '@nestjs/testing';
import { NotificationChannel, NotificationDelivery, NotificationStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { NotificationDeliveryRepository } from '../repositories/notification-delivery.repository';

describe('NotificationDeliveryRepository', () => {
  let repository: NotificationDeliveryRepository;
  let mockPrisma: any;

  const mockDelivery: NotificationDelivery = {
    id: 'del-1',
    notificationId: 'notif-1',
    channel: NotificationChannel.SMS,
    status: NotificationStatus.QUEUED,
    providerMessageId: 'SM123456789',
    sentAt: null,
    deliveredAt: null,
    readAt: null,
    failedReason: null,
    externalMetadata: { twilioSid: 'SM123456789' },
    retryCount: 0,
    nextRetryAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockPrisma = {
      notificationDelivery: {
        findUnique: jest.fn().mockResolvedValue(mockDelivery),
        findFirst: jest.fn().mockResolvedValue(mockDelivery),
        findMany: jest.fn().mockResolvedValue([mockDelivery]),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue(mockDelivery),
        update: jest.fn().mockResolvedValue(mockDelivery),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationDeliveryRepository,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    repository = module.get<NotificationDeliveryRepository>(NotificationDeliveryRepository);
  });

  describe('create', () => {
    it('should create a notification delivery attempt', async () => {
      const result = await repository.create({
        notificationId: 'notif-1',
        channel: NotificationChannel.SMS,
        providerMessageId: 'SM123456789',
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('del-1');
      expect(mockPrisma.notificationDelivery.create).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should find delivery by id', async () => {
      const result = await repository.findById('del-1');

      expect(result).toEqual(mockDelivery);
      expect(mockPrisma.notificationDelivery.findUnique).toHaveBeenCalledWith({
        where: { id: 'del-1' },
        include: { notification: true },
      });
    });
  });

  describe('findByNotification', () => {
    it('should return deliveries for a notification in chronological order', async () => {
      const results = await repository.findByNotification('notif-1');

      expect(results).toHaveLength(1);
      expect(mockPrisma.notificationDelivery.findMany).toHaveBeenCalledWith({
        where: { notificationId: 'notif-1' },
        orderBy: { createdAt: 'asc' },
        include: { notification: true },
      });
    });
  });

  describe('findByProviderMessageId', () => {
    it('should find delivery by provider message id', async () => {
      const result = await repository.findByProviderMessageId('SM123456789');

      expect(result).toEqual(mockDelivery);
      expect(mockPrisma.notificationDelivery.findFirst).toHaveBeenCalledWith({
        where: { providerMessageId: 'SM123456789' },
        include: { notification: true },
      });
    });
  });

  describe('findPendingRetries', () => {
    it('should query for failed deliveries with retryCount < 3 and nextRetryAt <= now', async () => {
      const now = new Date();
      await repository.findPendingRetries(20, now);

      expect(mockPrisma.notificationDelivery.findMany).toHaveBeenCalledWith({
        where: {
          status: NotificationStatus.FAILED,
          retryCount: { lt: 3 },
          nextRetryAt: { lte: now },
        },
        take: 20,
        orderBy: { nextRetryAt: 'asc' },
        include: { notification: true },
      });
    });
  });

  describe('updateStatus', () => {
    it('should update delivery status and failure reason', async () => {
      await repository.updateStatus('del-1', NotificationStatus.FAILED, 'Provider timeout');

      expect(mockPrisma.notificationDelivery.update).toHaveBeenCalledWith({
        where: { id: 'del-1' },
        data: { status: NotificationStatus.FAILED, failedReason: 'Provider timeout' },
        include: { notification: true },
      });
    });
  });

  describe('updateProviderMessageId', () => {
    it('should update provider message id', async () => {
      await repository.updateProviderMessageId('del-1', 'NEW-MSG-ID');

      expect(mockPrisma.notificationDelivery.update).toHaveBeenCalledWith({
        where: { id: 'del-1' },
        data: { providerMessageId: 'NEW-MSG-ID' },
        include: { notification: true },
      });
    });
  });

  describe('updateDeliveryMetadata', () => {
    it('should update external metadata', async () => {
      await repository.updateDeliveryMetadata('del-1', { customField: 'value' });

      expect(mockPrisma.notificationDelivery.update).toHaveBeenCalledWith({
        where: { id: 'del-1' },
        data: { externalMetadata: { customField: 'value' } },
        include: { notification: true },
      });
    });
  });

  describe('scheduleRetry', () => {
    it('should schedule next retry and increment retry count', async () => {
      const retryTime = new Date(Date.now() + 60000);
      await repository.scheduleRetry('del-1', retryTime, true);

      expect(mockPrisma.notificationDelivery.update).toHaveBeenCalledWith({
        where: { id: 'del-1' },
        data: {
          nextRetryAt: retryTime,
          status: NotificationStatus.FAILED,
          retryCount: { increment: 1 },
        },
        include: { notification: true },
      });
    });
  });

  describe('markSent', () => {
    it('should mark delivery sent with sentAt timestamp and provider ID', async () => {
      await repository.markSent('del-1', 'PROV-123');

      expect(mockPrisma.notificationDelivery.update).toHaveBeenCalledWith({
        where: { id: 'del-1' },
        data: {
          status: NotificationStatus.SENT,
          sentAt: expect.any(Date),
          providerMessageId: 'PROV-123',
        },
        include: { notification: true },
      });
    });
  });

  describe('markDelivered', () => {
    it('should mark delivery delivered with deliveredAt timestamp', async () => {
      const deliveredTime = new Date();
      await repository.markDelivered('del-1', deliveredTime);

      expect(mockPrisma.notificationDelivery.update).toHaveBeenCalledWith({
        where: { id: 'del-1' },
        data: {
          status: NotificationStatus.DELIVERED,
          deliveredAt: deliveredTime,
        },
        include: { notification: true },
      });
    });
  });

  describe('markFailed', () => {
    it('should mark delivery failed with failure reason', async () => {
      await repository.markFailed('del-1', 'Network error');

      expect(mockPrisma.notificationDelivery.update).toHaveBeenCalledWith({
        where: { id: 'del-1' },
        data: {
          status: NotificationStatus.FAILED,
          failedReason: 'Network error',
        },
        include: { notification: true },
      });
    });
  });

  describe('search', () => {
    it('should search deliveries with channel and status filter', async () => {
      const result = await repository.search({
        notificationId: 'notif-1',
        channel: NotificationChannel.SMS,
        status: NotificationStatus.QUEUED,
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
