import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationCategory, NotificationChannel, NotificationPriority } from '@prisma/client';
import { NotificationTemplateEntity } from '../../entities/notification-template.entity';
import { NotificationEntity } from '../../entities/notification.entity';
import { NotificationRepository } from '../../repositories/notification.repository';
import { NotificationDispatchService } from '../../services/notification-dispatch.service';
import { NotificationTemplateService } from '../../services/notification-template.service';
import { NotificationOwnerController } from '../notification-owner.controller';

describe('NotificationOwnerController', () => {
  let controller: NotificationOwnerController;
  let mockTemplateService: any;
  let mockDispatchService: any;
  let mockNotificationRepo: any;

  const mockOwner = { id: 'owner-1', salonId: 'sal-1', role: 'SALON_OWNER' };
  const mockOwnerNoSalon = { id: 'owner-2', role: 'SALON_OWNER' };

  const mockTemplate = new NotificationTemplateEntity({
    id: 'tmpl-1',
    salonId: 'sal-1',
    templateCode: 'BOOKING_REMINDER',
    channel: NotificationChannel.SMS,
    category: NotificationCategory.BOOKING,
    bodyTemplate: 'Reminder: booking at {{time}}',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mockNotification = new NotificationEntity({
    id: 'notif-1',
    userId: 'cust-1',
    salonId: 'sal-1',
    channel: NotificationChannel.SMS,
    priority: NotificationPriority.NORMAL,
    category: NotificationCategory.BOOKING,
    title: 'Reminder',
    body: 'Reminder: booking at 10:00 AM',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    mockTemplateService = {
      createTemplate: jest.fn().mockResolvedValue(mockTemplate),
      searchTemplates: jest.fn().mockResolvedValue({ data: [mockTemplate], total: 1 }),
      getTemplateById: jest.fn().mockResolvedValue(mockTemplate),
      updateTemplate: jest.fn().mockResolvedValue(mockTemplate),
      activateTemplate: jest.fn().mockResolvedValue(mockTemplate),
      deactivateTemplate: jest.fn().mockResolvedValue(mockTemplate),
      softDeleteTemplate: jest.fn().mockResolvedValue(mockTemplate),
      renderTemplate: jest.fn().mockResolvedValue({ subject: 'Reminder', body: 'Reminder: booking at 10:00 AM' }),
      previewTemplate: jest.fn().mockResolvedValue({ subject: 'Reminder', body: 'Reminder: booking at [time]' }),
    };

    mockDispatchService = {
      dispatch: jest.fn().mockResolvedValue(mockNotification),
    };

    mockNotificationRepo = {
      search: jest.fn().mockResolvedValue({ data: [mockNotification], total: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationOwnerController],
      providers: [
        { provide: NotificationTemplateService, useValue: mockTemplateService },
        { provide: NotificationDispatchService, useValue: mockDispatchService },
        { provide: NotificationRepository, useValue: mockNotificationRepo },
      ],
    }).compile();

    controller = module.get<NotificationOwnerController>(NotificationOwnerController);
  });

  describe('createTemplate', () => {
    it('should create salon template using user.salonId', async () => {
      const result = await controller.createTemplate(mockOwner, {
        templateCode: 'BOOKING_REMINDER',
        channel: NotificationChannel.SMS,
        category: NotificationCategory.BOOKING,
        bodyTemplate: 'Reminder: booking at {{time}}',
      });

      expect(result.data.templateCode).toBe('BOOKING_REMINDER');
      expect(mockTemplateService.createTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ salonId: 'sal-1' }),
        'owner-1',
      );
    });

    it('should throw ForbiddenException if user has no salon association', async () => {
      await expect(
        controller.createTemplate(mockOwnerNoSalon, {
          templateCode: 'BOOKING_REMINDER',
          channel: NotificationChannel.SMS,
          category: NotificationCategory.BOOKING,
          bodyTemplate: 'Reminder',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('searchTemplates', () => {
    it('should search templates for salon', async () => {
      const result = await controller.searchTemplates(mockOwner, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(mockTemplateService.searchTemplates).toHaveBeenCalledWith(
        expect.objectContaining({ salonId: 'sal-1' }),
      );
    });
  });

  describe('getTemplateById & updateTemplate & activate & deactivate & delete', () => {
    it('should get template by id with salon isolation', async () => {
      const result = await controller.getTemplateById(mockOwner, 'tmpl-1');

      expect(result.data.id).toBe('tmpl-1');
      expect(mockTemplateService.getTemplateById).toHaveBeenCalledWith('tmpl-1', 'sal-1');
    });

    it('should update template with salon isolation', async () => {
      const result = await controller.updateTemplate(mockOwner, 'tmpl-1', {
        bodyTemplate: 'Updated body',
      });

      expect(result.data).toBeDefined();
      expect(mockTemplateService.updateTemplate).toHaveBeenCalledWith(
        'tmpl-1',
        expect.any(Object),
        'sal-1',
        'owner-1',
      );
    });

    it('should activate template', async () => {
      const result = await controller.activateTemplate(mockOwner, 'tmpl-1');
      expect(result.data).toBeDefined();
    });

    it('should deactivate template', async () => {
      const result = await controller.deactivateTemplate(mockOwner, 'tmpl-1');
      expect(result.data).toBeDefined();
    });

    it('should soft delete template', async () => {
      const result = await controller.deleteTemplate(mockOwner, 'tmpl-1');
      expect(result.data).toBeDefined();
    });
  });

  describe('sendNotification & broadcastNotification & getNotificationHistory', () => {
    it('should dispatch salon notification to customer', async () => {
      const result = await controller.sendNotification(mockOwner, {
        userId: 'cust-1',
        title: 'Reminder',
        body: 'Reminder: booking at 10:00 AM',
      });

      expect(result.data.id).toBe('notif-1');
      expect(mockDispatchService.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ salonId: 'sal-1', userId: 'cust-1' }),
        'owner-1',
      );
    });

    it('should broadcast notification to multiple salon customers', async () => {
      const result = await controller.broadcastNotification(mockOwner, {
        userIds: ['cust-1', 'cust-2'],
        title: 'Salon Promo',
        body: 'Special offer today!',
      });

      expect(result.data.totalTargeted).toBe(2);
      expect(result.data.successful).toBe(2);
    });

    it('should search notification history for salon', async () => {
      const result = await controller.getNotificationHistory(mockOwner, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(mockNotificationRepo.search).toHaveBeenCalledWith(
        expect.objectContaining({ salonId: 'sal-1' }),
      );
    });
  });
});
