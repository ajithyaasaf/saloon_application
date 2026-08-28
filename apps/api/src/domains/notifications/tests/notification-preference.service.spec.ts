import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationChannel, NotificationPriority, UserNotificationPreference } from '@prisma/client';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { UserNotificationPreferenceRepository } from '../repositories/user-notification-preference.repository';
import { NotificationPreferenceService } from '../services/notification-preference.service';

describe('NotificationPreferenceService', () => {
  let service: NotificationPreferenceService;
  let mockPreferenceRepo: any;
  let mockAuditService: any;
  let mockCacheService: any;
  let mockEventBus: any;

  const mockStoredPreference: UserNotificationPreference = {
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
    mockPreferenceRepo = {
      findByUser: jest.fn().mockResolvedValue([mockStoredPreference]),
      findByUserAndChannel: jest.fn().mockImplementation((_: any, channel: any) => {
        if (channel === NotificationChannel.SMS) {
          return Promise.resolve(mockStoredPreference);
        }
        return Promise.resolve(null);
      }),
      upsert: jest.fn().mockImplementation((data: any) =>
        Promise.resolve({
          id: 'pref-new',
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
    };

    mockAuditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    mockCacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationPreferenceService,
        { provide: UserNotificationPreferenceRepository, useValue: mockPreferenceRepo },
        { provide: AuditService, useValue: mockAuditService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<NotificationPreferenceService>(NotificationPreferenceService);
  });

  describe('getUserPreferences', () => {
    it('should return complete channel matrix with defaults for unconfigured channels', async () => {
      const preferences = await service.getUserPreferences('user-1');

      expect(preferences).toHaveLength(5);
      const smsPref = preferences.find((p) => p.channel === NotificationChannel.SMS);
      expect(smsPref?.quietHoursEnabled).toBe(true);

      const emailPref = preferences.find((p) => p.channel === NotificationChannel.EMAIL);
      expect(emailPref?.isEnabled).toBe(true);
      expect(emailPref?.quietHoursEnabled).toBe(false);
    });
  });

  describe('getPreferenceByChannel', () => {
    it('should return stored preference if exists', async () => {
      const pref = await service.getPreferenceByChannel('user-1', NotificationChannel.SMS);
      expect(pref.channel).toBe(NotificationChannel.SMS);
      expect(pref.quietHoursEnabled).toBe(true);
    });

    it('should return default enabled preference if not stored', async () => {
      const pref = await service.getPreferenceByChannel('user-1', NotificationChannel.EMAIL);
      expect(pref.channel).toBe(NotificationChannel.EMAIL);
      expect(pref.isEnabled).toBe(true);
    });
  });

  describe('updatePreference', () => {
    it('should upsert preference, invalidate cache, log audit, and publish event', async () => {
      const result = await service.updatePreference(
        {
          userId: 'user-1',
          channel: NotificationChannel.PUSH,
          isEnabled: false,
          quietHoursEnabled: true,
          quietHoursStart: '23:00:00',
          quietHoursEnd: '07:00:00',
        },
        'user-1',
      );

      expect(result.isEnabled).toBe(false);
      expect(mockCacheService.delete).toHaveBeenCalledWith('notification-preferences:user-1');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE', entityType: 'UserNotificationPreference' }),
      );
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should reject invalid time format for quiet hours', async () => {
      await expect(
        service.updatePreference({
          userId: 'user-1',
          channel: NotificationChannel.PUSH,
          quietHoursStart: 'invalid-time',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('canDeliver', () => {
    it('should allow delivery when channel is enabled and outside quiet hours', async () => {
      // 14:00 UTC is outside 22:00 -> 08:00
      const afternoon = new Date('2026-06-15T14:00:00Z');
      const result = await service.canDeliver(
        'user-1',
        NotificationChannel.SMS,
        NotificationPriority.NORMAL,
        afternoon,
      );

      expect(result.allowed).toBe(true);
    });

    it('should suppress delivery during quiet hours for NORMAL priority', async () => {
      // 23:30 UTC is inside 22:00 -> 08:00
      const night = new Date('2026-06-15T23:30:00Z');
      const result = await service.canDeliver(
        'user-1',
        NotificationChannel.SMS,
        NotificationPriority.NORMAL,
        night,
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('quiet hours');
    });

    it('should bypass quiet hours for CRITICAL priority notifications', async () => {
      // 23:30 UTC is inside quiet hours, but CRITICAL priority bypasses
      const night = new Date('2026-06-15T23:30:00Z');
      const result = await service.canDeliver(
        'user-1',
        NotificationChannel.SMS,
        NotificationPriority.CRITICAL,
        night,
      );

      expect(result.allowed).toBe(true);
    });

    it('should suppress delivery if channel is disabled', async () => {
      mockPreferenceRepo.findByUserAndChannel.mockResolvedValue({
        ...mockStoredPreference,
        isEnabled: false,
      });

      const result = await service.canDeliver(
        'user-1',
        NotificationChannel.SMS,
        NotificationPriority.CRITICAL,
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('opted out');
    });
  });
});
