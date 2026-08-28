import { Test, TestingModule } from '@nestjs/testing';
import {
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
} from '@prisma/client';
import { AuditService } from '../../../shared/audit/audit.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { NotificationService as TransportNotificationService } from '../../../shared/notification/notification.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { NotificationTemplateEntity } from '../entities/notification-template.entity';
import { NotificationDeliveryRepository } from '../repositories/notification-delivery.repository';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationDispatchService } from '../services/notification-dispatch.service';
import { NotificationPreferenceService } from '../services/notification-preference.service';
import { NotificationTemplateService } from '../services/notification-template.service';

describe('NotificationDispatchService', () => {
  let service: NotificationDispatchService;
  let mockNotificationRepo: any;
  let mockDeliveryRepo: any;
  let mockTemplateService: any;
  let mockPreferenceService: any;
  let mockTransportService: any;
  let mockTransactionService: any;
  let mockAuditService: any;
  let mockEventBus: any;

  const mockNotif = {
    id: 'notif-100',
    salonId: 'sal-1',
    userId: 'user-1',
    templateId: 'tmpl-1',
    channel: NotificationChannel.PUSH,
    priority: NotificationPriority.HIGH,
    category: NotificationCategory.BOOKING,
    title: 'Booking Confirmed',
    body: 'Your slot is booked for 10:00 AM.',
    idempotencyKey: 'booking:100',
    metadata: null,
    scheduledAt: null,
    readAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockDelivery = {
    id: 'del-100',
    notificationId: 'notif-100',
    channel: NotificationChannel.SMS,
    status: NotificationStatus.QUEUED,
    providerMessageId: null,
    sentAt: null,
    deliveredAt: null,
    readAt: null,
    failedReason: null,
    externalMetadata: null,
    retryCount: 0,
    nextRetryAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockNotificationRepo = {
      findByIdempotencyKey: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(mockNotif),
      findById: jest.fn().mockResolvedValue(mockNotif),
    };

    mockDeliveryRepo = {
      create: jest.fn().mockResolvedValue(mockDelivery),
      markSent: jest.fn().mockResolvedValue({ ...mockDelivery, status: NotificationStatus.SENT }),
      markFailed: jest.fn().mockResolvedValue({ ...mockDelivery, status: NotificationStatus.FAILED }),
      scheduleRetry: jest.fn().mockResolvedValue({ ...mockDelivery, retryCount: 1 }),
      findPendingRetries: jest.fn().mockResolvedValue([mockDelivery]),
    };

    mockTemplateService = {
      resolveTemplate: jest.fn().mockResolvedValue(
        new NotificationTemplateEntity({
          id: 'tmpl-1',
          templateCode: 'BOOKING_CONFIRMED',
          channel: NotificationChannel.SMS,
          bodyTemplate: 'Your slot is booked for {{time}}.',
          subjectTemplate: 'Booking Confirmed',
          isActive: true,
        }),
      ),
    };

    mockPreferenceService = {
      canDeliver: jest.fn().mockResolvedValue({ allowed: true }),
    };

    mockTransportService = {
      send: jest.fn().mockResolvedValue({ jobId: 'JOB-999', status: 'QUEUED' }),
    };

    mockTransactionService = {
      run: jest.fn().mockImplementation((cb) => cb()),
    };

    mockAuditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationDispatchService,
        { provide: NotificationRepository, useValue: mockNotificationRepo },
        { provide: NotificationDeliveryRepository, useValue: mockDeliveryRepo },
        { provide: NotificationTemplateService, useValue: mockTemplateService },
        { provide: NotificationPreferenceService, useValue: mockPreferenceService },
        { provide: TransportNotificationService, useValue: mockTransportService },
        { provide: TransactionService, useValue: mockTransactionService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<NotificationDispatchService>(NotificationDispatchService);
  });

  describe('dispatch', () => {
    it('should resolve template, evaluate preferences, persist atomically, and dispatch via transport', async () => {
      const result = await service.dispatch(
        {
          userId: 'user-1',
          salonId: 'sal-1',
          templateCode: 'BOOKING_CONFIRMED',
          channels: [NotificationChannel.SMS, NotificationChannel.IN_APP],
          templateVariables: { time: '10:00 AM' },
          priority: NotificationPriority.HIGH,
          idempotencyKey: 'booking:100',
        },
        'system-actor',
      );

      expect(result).toBeDefined();
      expect(mockTemplateService.resolveTemplate).toHaveBeenCalled();
      expect(mockPreferenceService.canDeliver).toHaveBeenCalled();
      expect(mockTransactionService.run).toHaveBeenCalled();
      expect(mockTransportService.send).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE', entityType: 'Notification' }),
      );
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should return existing notification if idempotencyKey is already present', async () => {
      mockNotificationRepo.findByIdempotencyKey.mockResolvedValue(mockNotif);

      const result = await service.dispatch({
        userId: 'user-1',
        title: 'Duplicate test',
        body: 'Body',
        idempotencyKey: 'booking:100',
      });

      expect(result.id).toBe('notif-100');
      expect(mockNotificationRepo.create).not.toHaveBeenCalled();
      expect(mockTransportService.send).not.toHaveBeenCalled();
    });

    it('should suppress disabled channels based on user preferences', async () => {
      mockPreferenceService.canDeliver.mockImplementation((_: any, channel: any) => {
        if (channel === NotificationChannel.SMS) {
          return Promise.resolve({ allowed: false, reason: 'Opted out' });
        }
        return Promise.resolve({ allowed: true });
      });

      await service.dispatch({
        userId: 'user-1',
        title: 'Multi-channel',
        body: 'Test content',
        channels: [NotificationChannel.SMS, NotificationChannel.IN_APP],
      });

      // SMS was suppressed, only IN_APP should be created
      expect(mockDeliveryRepo.create).toHaveBeenCalledTimes(1);
      expect(mockDeliveryRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ channel: NotificationChannel.IN_APP }),
      );
    });

    it('should handle transport error, record failure and schedule retry', async () => {
      mockTransportService.send.mockRejectedValue(new Error('Twilio Network Error'));

      await service.dispatch({
        userId: 'user-1',
        title: 'Failing SMS',
        body: 'Test body',
        channels: [NotificationChannel.SMS],
      });

      expect(mockDeliveryRepo.markFailed).toHaveBeenCalledWith(
        'del-100',
        'Twilio Network Error',
      );
      expect(mockDeliveryRepo.scheduleRetry).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalled();
    });
  });

  describe('processRetries', () => {
    it('should re-dispatch failed deliveries and update sent status', async () => {
      const failedDelivery = {
        ...mockDelivery,
        status: NotificationStatus.FAILED,
        retryCount: 1,
      };
      mockDeliveryRepo.findPendingRetries.mockResolvedValue([failedDelivery]);

      const count = await service.processRetries(10);

      expect(count).toBe(1);
      expect(mockTransportService.send).toHaveBeenCalled();
      expect(mockDeliveryRepo.markSent).toHaveBeenCalled();
    });
  });
});
