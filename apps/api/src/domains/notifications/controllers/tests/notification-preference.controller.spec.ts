import { Test, TestingModule } from '@nestjs/testing';
import { NotificationChannel } from '@prisma/client';
import { UserNotificationPreferenceEntity } from '../../entities/user-notification-preference.entity';
import { NotificationPreferenceService } from '../../services/notification-preference.service';
import { NotificationPreferenceController } from '../notification-preference.controller';

describe('NotificationPreferenceController', () => {
  let controller: NotificationPreferenceController;
  let mockPreferenceService: any;

  const mockUser = { id: 'user-1' };

  const mockPreference = new UserNotificationPreferenceEntity({
    id: 'pref-1',
    userId: 'user-1',
    channel: NotificationChannel.SMS,
    isEnabled: true,
    quietHoursEnabled: true,
    quietHoursStart: '22:00:00',
    quietHoursEnd: '08:00:00',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    mockPreferenceService = {
      getUserPreferences: jest.fn().mockResolvedValue([mockPreference]),
      getPreferenceByChannel: jest.fn().mockResolvedValue(mockPreference),
      updatePreference: jest.fn().mockResolvedValue(mockPreference),
      enableChannel: jest.fn().mockResolvedValue(mockPreference),
      disableChannel: jest.fn().mockResolvedValue(new UserNotificationPreferenceEntity({ ...mockPreference, isEnabled: false })),
      setQuietHours: jest.fn().mockResolvedValue(mockPreference),
      removeQuietHours: jest.fn().mockResolvedValue(new UserNotificationPreferenceEntity({ ...mockPreference, quietHoursEnabled: false })),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationPreferenceController],
      providers: [
        { provide: NotificationPreferenceService, useValue: mockPreferenceService },
      ],
    }).compile();

    controller = module.get<NotificationPreferenceController>(NotificationPreferenceController);
  });

  describe('getPreferences', () => {
    it('should return all preferences for authenticated user', async () => {
      const result = await controller.getPreferences(mockUser);

      expect(result.data).toHaveLength(1);
      expect(mockPreferenceService.getUserPreferences).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getPreferenceByChannel', () => {
    it('should return preference by channel', async () => {
      const result = await controller.getPreferenceByChannel(mockUser, NotificationChannel.SMS);

      expect(result.data.channel).toBe(NotificationChannel.SMS);
      expect(mockPreferenceService.getPreferenceByChannel).toHaveBeenCalledWith(
        'user-1',
        NotificationChannel.SMS,
      );
    });
  });

  describe('updatePreference & enableChannel & disableChannel', () => {
    it('should update preference', async () => {
      const result = await controller.updatePreference(mockUser, {
        channel: NotificationChannel.SMS,
        isEnabled: true,
      });

      expect(result.data).toBeDefined();
      expect(mockPreferenceService.updatePreference).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', channel: NotificationChannel.SMS }),
        'user-1',
      );
    });

    it('should enable channel', async () => {
      const result = await controller.enableChannel(mockUser, NotificationChannel.SMS);
      expect(result.data).toBeDefined();
      expect(mockPreferenceService.enableChannel).toHaveBeenCalledWith(
        'user-1',
        NotificationChannel.SMS,
        'user-1',
      );
    });

    it('should disable channel', async () => {
      const result = await controller.disableChannel(mockUser, NotificationChannel.SMS);
      expect(result.data.isEnabled).toBe(false);
      expect(mockPreferenceService.disableChannel).toHaveBeenCalledWith(
        'user-1',
        NotificationChannel.SMS,
        'user-1',
      );
    });
  });

  describe('setQuietHours & removeQuietHours', () => {
    it('should configure quiet hours', async () => {
      const result = await controller.setQuietHours(mockUser, {
        channel: NotificationChannel.SMS,
        start: '22:00:00',
        end: '08:00:00',
      });

      expect(result.data).toBeDefined();
      expect(mockPreferenceService.setQuietHours).toHaveBeenCalledWith(
        'user-1',
        NotificationChannel.SMS,
        '22:00:00',
        '08:00:00',
        'user-1',
      );
    });

    it('should remove quiet hours', async () => {
      const result = await controller.removeQuietHours(mockUser, NotificationChannel.SMS);
      expect(result.data.quietHoursEnabled).toBe(false);
      expect(mockPreferenceService.removeQuietHours).toHaveBeenCalledWith(
        'user-1',
        NotificationChannel.SMS,
        'user-1',
      );
    });
  });
});
