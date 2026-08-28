import { Test, TestingModule } from '@nestjs/testing';
import { NotificationCategory, NotificationChannel, NotificationPriority } from '@prisma/client';
import { NotificationEntity } from '../../entities/notification.entity';
import { NotificationInboxService } from '../../services/notification-inbox.service';
import { NotificationCustomerController } from '../notification-customer.controller';

describe('NotificationCustomerController', () => {
  let controller: NotificationCustomerController;
  let mockInboxService: any;

  const mockCustomer = { id: 'cust-1', role: 'CUSTOMER' };

  const mockNotification = new NotificationEntity({
    id: 'notif-1',
    userId: 'cust-1',
    salonId: 'sal-1',
    channel: NotificationChannel.IN_APP,
    priority: NotificationPriority.NORMAL,
    category: NotificationCategory.BOOKING,
    title: 'Reminder',
    body: 'Your session is coming up.',
    readAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    mockInboxService = {
      getInbox: jest.fn().mockResolvedValue({ data: [mockNotification], total: 1, unreadCount: 1 }),
      getUnreadCount: jest.fn().mockResolvedValue(1),
      getNotificationById: jest.fn().mockResolvedValue(mockNotification),
      markAsRead: jest.fn().mockResolvedValue(new NotificationEntity({ ...mockNotification, readAt: new Date() })),
      markAsUnread: jest.fn().mockResolvedValue(mockNotification),
      markAllAsRead: jest.fn().mockResolvedValue({ updatedCount: 3 }),
      deleteNotification: jest.fn().mockResolvedValue(mockNotification),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationCustomerController],
      providers: [
        { provide: NotificationInboxService, useValue: mockInboxService },
      ],
    }).compile();

    controller = module.get<NotificationCustomerController>(NotificationCustomerController);
  });

  describe('getInbox', () => {
    it('should return paginated inbox for authenticated customer', async () => {
      const result = await controller.getInbox(mockCustomer, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.pagination.total).toBe(1);
      expect(mockInboxService.getInbox).toHaveBeenCalledWith(
        'cust-1',
        expect.objectContaining({ page: 1, limit: 10 }),
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count for customer badge', async () => {
      const result = await controller.getUnreadCount(mockCustomer);

      expect(result.data.unreadCount).toBe(1);
      expect(mockInboxService.getUnreadCount).toHaveBeenCalledWith('cust-1');
    });
  });

  describe('getNotificationById', () => {
    it('should return notification by id scoped to customer', async () => {
      const result = await controller.getNotificationById(mockCustomer, 'notif-1');

      expect(result.data.id).toBe('notif-1');
      expect(mockInboxService.getNotificationById).toHaveBeenCalledWith('notif-1', 'cust-1');
    });
  });

  describe('markAsRead & markAsUnread & markAllAsRead & deleteNotification', () => {
    it('should mark notification read', async () => {
      const result = await controller.markAsRead(mockCustomer, 'notif-1');

      expect(result.data.isRead).toBe(true);
      expect(mockInboxService.markAsRead).toHaveBeenCalledWith('notif-1', 'cust-1', 'cust-1');
    });

    it('should mark notification unread', async () => {
      const result = await controller.markAsUnread(mockCustomer, 'notif-1');

      expect(result.data.isRead).toBe(false);
      expect(mockInboxService.markAsUnread).toHaveBeenCalledWith('notif-1', 'cust-1', 'cust-1');
    });

    it('should mark all notifications read', async () => {
      const result = await controller.markAllAsRead(mockCustomer);

      expect(result.data.updatedCount).toBe(3);
      expect(mockInboxService.markAllAsRead).toHaveBeenCalledWith('cust-1', 'cust-1');
    });

    it('should delete notification', async () => {
      const result = await controller.deleteNotification(mockCustomer, 'notif-1');

      expect(result.data).toBeDefined();
      expect(mockInboxService.deleteNotification).toHaveBeenCalledWith('notif-1', 'cust-1', 'cust-1');
    });
  });
});
