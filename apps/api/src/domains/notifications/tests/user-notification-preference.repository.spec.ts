import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationChannel, Prisma, UserNotificationPreference } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { UserNotificationPreferenceRepository } from '../repositories/user-notification-preference.repository';

describe('UserNotificationPreferenceRepository', () => {
  let repository: UserNotificationPreferenceRepository;
  let mockPrisma: any;

  const mockPreference: UserNotificationPreference = {
    id: 'pref-1',
    userId: 'user-1',
    channel: NotificationChannel.SMS,
    isEnabled: true,
    quietHoursEnabled: true,
    quietHoursStart: '22:00:00',
    quietHoursEnd: '08:00:00',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockPrisma = {
      userNotificationPreference: {
        findUnique: jest.fn().mockResolvedValue(mockPreference),
        findFirst: jest.fn().mockResolvedValue(mockPreference),
        findMany: jest.fn().mockResolvedValue([mockPreference]),
        create: jest.fn().mockResolvedValue(mockPreference),
        update: jest.fn().mockResolvedValue(mockPreference),
        upsert: jest.fn().mockResolvedValue(mockPreference),
        delete: jest.fn().mockResolvedValue(mockPreference),
        deleteMany: jest.fn().mockResolvedValue({ count: 4 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserNotificationPreferenceRepository,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    repository = module.get<UserNotificationPreferenceRepository>(
      UserNotificationPreferenceRepository,
    );
  });

  describe('create', () => {
    it('should create preference', async () => {
      const result = await repository.create({
        userId: 'user-1',
        channel: NotificationChannel.SMS,
        isEnabled: true,
        quietHoursEnabled: true,
        quietHoursStart: '22:00:00',
        quietHoursEnd: '08:00:00',
      });

      expect(result).toBeDefined();
      expect(result.channel).toBe(NotificationChannel.SMS);
      expect(mockPrisma.userNotificationPreference.create).toHaveBeenCalled();
    });

    it('should throw ConflictException on duplicate user-channel preference', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '5.22.0',
      });
      mockPrisma.userNotificationPreference.create.mockRejectedValue(prismaError);

      await expect(
        repository.create({
          userId: 'user-1',
          channel: NotificationChannel.SMS,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findById', () => {
    it('should find preference by id', async () => {
      const result = await repository.findById('pref-1');

      expect(result).toEqual(mockPreference);
      expect(mockPrisma.userNotificationPreference.findUnique).toHaveBeenCalledWith({
        where: { id: 'pref-1' },
        include: { user: true },
      });
    });
  });

  describe('findByUser', () => {
    it('should return all preferences for a user', async () => {
      const results = await repository.findByUser('user-1');

      expect(results).toHaveLength(1);
      expect(mockPrisma.userNotificationPreference.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { channel: 'asc' },
        include: { user: true },
      });
    });
  });

  describe('findByUserAndChannel', () => {
    it('should return preference by unique user and channel constraint', async () => {
      const result = await repository.findByUserAndChannel('user-1', NotificationChannel.SMS);

      expect(result).toEqual(mockPreference);
      expect(mockPrisma.userNotificationPreference.findUnique).toHaveBeenCalledWith({
        where: {
          userId_channel: {
            userId: 'user-1',
            channel: NotificationChannel.SMS,
          },
        },
        include: { user: true },
      });
    });
  });

  describe('findEnabledByUser', () => {
    it('should query only enabled channels for user', async () => {
      await repository.findEnabledByUser('user-1');

      expect(mockPrisma.userNotificationPreference.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isEnabled: true },
        orderBy: { channel: 'asc' },
        include: { user: true },
      });
    });
  });

  describe('upsert', () => {
    it('should atomically upsert preference with quiet hours', async () => {
      const result = await repository.upsert({
        userId: 'user-1',
        channel: NotificationChannel.EMAIL,
        isEnabled: false,
        quietHoursEnabled: true,
        quietHoursStart: '23:00:00',
        quietHoursEnd: '07:00:00',
      });

      expect(result).toBeDefined();
      expect(mockPrisma.userNotificationPreference.upsert).toHaveBeenCalledWith({
        where: {
          userId_channel: {
            userId: 'user-1',
            channel: NotificationChannel.EMAIL,
          },
        },
        create: expect.objectContaining({
          userId: 'user-1',
          channel: NotificationChannel.EMAIL,
          isEnabled: false,
        }),
        update: expect.objectContaining({
          isEnabled: false,
          quietHoursEnabled: true,
        }),
        include: { user: true },
      });
    });
  });

  describe('update', () => {
    it('should update preference fields', async () => {
      await repository.update('pref-1', { isEnabled: false });

      expect(mockPrisma.userNotificationPreference.update).toHaveBeenCalledWith({
        where: { id: 'pref-1' },
        data: { isEnabled: false },
        include: { user: true },
      });
    });
  });

  describe('delete', () => {
    it('should delete preference by id and user', async () => {
      await repository.delete('pref-1', 'user-1');

      expect(mockPrisma.userNotificationPreference.delete).toHaveBeenCalledWith({
        where: { id: 'pref-1' },
        include: { user: true },
      });
    });
  });

  describe('deleteByUser', () => {
    it('should delete all preferences for user', async () => {
      const count = await repository.deleteByUser('user-1');

      expect(count).toBe(4);
      expect(mockPrisma.userNotificationPreference.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });
  });
});
