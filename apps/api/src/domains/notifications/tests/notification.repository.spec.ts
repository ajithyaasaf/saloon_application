import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  Notification,
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { NotificationRepository } from '../repositories/notification.repository';

describe('NotificationRepository', () => {
  let repository: NotificationRepository;
  let mockPrisma: any;

  const mockNotification: Notification = {
    id: 'notif-1',
    salonId: 'sal-1',
    userId: 'user-1',
    templateId: 'tmpl-1',
    channel: NotificationChannel.PUSH,
    priority: NotificationPriority.HIGH,
    category: NotificationCategory.BOOKING,
    title: 'Booking Confirmed',
    body: 'Your hair styling session is confirmed.',
    idempotencyKey: 'booking-confirmed:book-123',
    metadata: { bookingId: 'book-123' },
    scheduledAt: null,
    readAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    mockPrisma = {
      notification: {
        findFirst: jest.fn().mockResolvedValue(mockNotification),
        findMany: jest.fn().mockResolvedValue([mockNotification]),
        findUnique: jest.fn().mockResolvedValue(mockNotification),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue(mockNotification),
        update: jest.fn().mockResolvedValue({ ...mockNotification, readAt: new Date() }),
        updateMany: jest.fn().mockResolvedValue({ count: 3 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationRepository,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    repository = module.get<NotificationRepository>(NotificationRepository);
  });

  describe('create', () => {
    it('should create a notification', async () => {
      const result = await repository.create({
        salonId: 'sal-1',
        userId: 'user-1',
        channel: NotificationChannel.PUSH,
        priority: NotificationPriority.HIGH,
        category: NotificationCategory.BOOKING,
        title: 'Booking Confirmed',
        body: 'Your hair styling session is confirmed.',
        idempotencyKey: 'booking-confirmed:book-123',
      });

      expect(result).toBeDefined();
      expect(result.idempotencyKey).toBe('booking-confirmed:book-123');
      expect(mockPrisma.notification.create).toHaveBeenCalled();
    });

    it('should throw ConflictException on duplicate idempotencyKey', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique violation', {
        code: 'P2002',
        clientVersion: '5.22.0',
      });
      mockPrisma.notification.create.mockRejectedValue(prismaError);

      await expect(
        repository.create({
          userId: 'user-1',
          title: 'Booking Confirmed',
          body: 'Duplicate test',
          idempotencyKey: 'booking-confirmed:book-123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findById', () => {
    it('should return notification by id including relations', async () => {
      const result = await repository.findById('notif-1');

      expect(result).toEqual(mockNotification);
      expect(mockPrisma.notification.findFirst).toHaveBeenCalledWith({
        where: { id: 'notif-1', deletedAt: null },
        include: { template: true, deliveries: true },
      });
    });
  });

  describe('findByUser', () => {
    it('should return paginated user notifications', async () => {
      const result = await repository.findByUser('user-1', { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', deletedAt: null },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { template: true, deliveries: true },
      });
    });

    it('should filter by unread when isRead is false', async () => {
      await repository.findByUser('user-1', { isRead: false });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', deletedAt: null, readAt: null },
        }),
      );
    });
  });

  describe('findBySalon', () => {
    it('should return paginated salon notifications', async () => {
      const result = await repository.findBySalon('sal-1', { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('findByUserAndId', () => {
    it('should enforce user ownership when finding notification', async () => {
      const result = await repository.findByUserAndId('user-1', 'notif-1');

      expect(result).toEqual(mockNotification);
      expect(mockPrisma.notification.findFirst).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId: 'user-1', deletedAt: null },
        include: { template: true, deliveries: true },
      });
    });
  });

  describe('findByIdempotencyKey', () => {
    it('should find notification by idempotency key', async () => {
      const result = await repository.findByIdempotencyKey('booking-confirmed:book-123');

      expect(result).toEqual(mockNotification);
      expect(mockPrisma.notification.findFirst).toHaveBeenCalledWith({
        where: { idempotencyKey: 'booking-confirmed:book-123', deletedAt: null },
        include: { template: true, deliveries: true },
      });
    });
  });

  describe('markRead', () => {
    it('should set readAt timestamp', async () => {
      const result = await repository.markRead('notif-1', 'user-1');

      expect(result?.readAt).toBeDefined();
      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { readAt: expect.any(Date) },
        include: { template: true, deliveries: true },
      });
    });

    it('should return null if notification does not exist', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);

      const result = await repository.markRead('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('markUnread', () => {
    it('should clear readAt timestamp', async () => {
      mockPrisma.notification.update.mockResolvedValue({ ...mockNotification, readAt: null });

      const result = await repository.markUnread('notif-1', 'user-1');

      expect(result?.readAt).toBeNull();
      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { readAt: null },
        include: { template: true, deliveries: true },
      });
    });
  });

  describe('markAllRead', () => {
    it('should mark all unread notifications read for a user', async () => {
      const count = await repository.markAllRead('user-1');

      expect(count).toBe(3);
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', readAt: null, deletedAt: null },
        data: { readAt: expect.any(Date) },
      });
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt timestamp', async () => {
      await repository.softDelete('notif-1', 'user-1');

      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { deletedAt: expect.any(Date) },
        include: { template: true, deliveries: true },
      });
    });
  });

  describe('countUnread', () => {
    it('should return unread count for user', async () => {
      mockPrisma.notification.count.mockResolvedValue(5);

      const count = await repository.countUnread('user-1');

      expect(count).toBe(5);
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', readAt: null, deletedAt: null },
      });
    });
  });

  describe('search', () => {
    it('should search with channel, category, priority, and date range', async () => {
      const result = await repository.search({
        userId: 'user-1',
        channel: NotificationChannel.PUSH,
        priority: NotificationPriority.HIGH,
        category: NotificationCategory.BOOKING,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(mockPrisma.notification.findMany).toHaveBeenCalled();
    });
  });
});
