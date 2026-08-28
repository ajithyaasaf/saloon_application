import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  Notification,
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
} from '@prisma/client';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationInboxService } from '../services/notification-inbox.service';

describe('NotificationInboxService', () => {
  let service: NotificationInboxService;
  let mockNotificationRepo: any;
  let mockAuditService: any;
  let mockCacheService: any;
  let mockEventBus: any;

  const mockNotif: Notification = {
    id: 'notif-1',
    salonId: 'sal-1',
    userId: 'user-1',
    templateId: null,
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.NORMAL,
    category: NotificationCategory.BOOKING,
    title: 'Reminder',
    body: 'Your session is coming up soon.',
    idempotencyKey: null,
    metadata: null,
    scheduledAt: null,
    readAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    mockNotificationRepo = {
      search: jest.fn().mockResolvedValue({ data: [mockNotif], total: 1 }),
      findByUserAndId: jest.fn().mockImplementation((userId: string, id: string) => {
        if (userId === 'user-1' && id === 'notif-1') {
          return Promise.resolve(mockNotif);
        }
        return Promise.resolve(null);
      }),
      markRead: jest.fn().mockResolvedValue({ ...mockNotif, readAt: new Date() }),
      markUnread: jest.fn().mockResolvedValue({ ...mockNotif, readAt: null }),
      markAllRead: jest.fn().mockResolvedValue(4),
      softDelete: jest.fn().mockResolvedValue({ ...mockNotif, deletedAt: new Date() }),
      countUnread: jest.fn().mockResolvedValue(3),
    };

    mockAuditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    mockCacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      deleteByPattern: jest.fn().mockResolvedValue(undefined),
    };

    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationInboxService,
        { provide: NotificationRepository, useValue: mockNotificationRepo },
        { provide: AuditService, useValue: mockAuditService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<NotificationInboxService>(NotificationInboxService);
  });

  describe('getInbox', () => {
    it('should return paginated notifications with unread count', async () => {
      const inbox = await service.getInbox('user-1', { page: 1, limit: 10 });

      expect(inbox.data).toHaveLength(1);
      expect(inbox.total).toBe(1);
      expect(inbox.unreadCount).toBe(3);
    });
  });

  describe('getNotificationById', () => {
    it('should return notification when owned by user', async () => {
      const result = await service.getNotificationById('notif-1', 'user-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('notif-1');
    });

    it('should throw NotFoundException if notification is owned by another user', async () => {
      await expect(
        service.getNotificationById('notif-1', 'user-other'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification read, invalidate cache, log audit, and publish event', async () => {
      const result = await service.markAsRead('notif-1', 'user-1', 'user-1');

      expect(result.readAt).toBeDefined();
      expect(mockCacheService.delete).toHaveBeenCalledWith('notification-inbox:user-1:unread');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE', entityType: 'Notification' }),
      );
      expect(mockEventBus.publish).toHaveBeenCalled();
    });
  });

  describe('markAsUnread', () => {
    it('should clear readAt timestamp', async () => {
      const result = await service.markAsUnread('notif-1', 'user-1', 'user-1');

      expect(result.readAt).toBeNull();
      expect(mockNotificationRepo.markUnread).toHaveBeenCalledWith('notif-1', 'user-1');
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications read for user', async () => {
      const result = await service.markAllAsRead('user-1', 'user-1');

      expect(result.updatedCount).toBe(4);
      expect(mockCacheService.delete).toHaveBeenCalledWith('notification-inbox:user-1:unread');
    });
  });

  describe('deleteNotification', () => {
    it('should soft delete notification', async () => {
      const result = await service.deleteNotification('notif-1', 'user-1', 'user-1');

      expect(result).toBeDefined();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DELETE', entityType: 'Notification' }),
      );
      expect(mockEventBus.publish).toHaveBeenCalled();
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count and populate cache on miss', async () => {
      const count = await service.getUnreadCount('user-1');

      expect(count).toBe(3);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'notification-inbox:user-1:unread',
        3,
        60,
      );
    });

    it('should return cached value if present', async () => {
      mockCacheService.get.mockResolvedValue(10);

      const count = await service.getUnreadCount('user-1');

      expect(count).toBe(10);
      expect(mockNotificationRepo.countUnread).not.toHaveBeenCalled();
    });
  });
});
