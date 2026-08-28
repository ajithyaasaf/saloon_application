import { Test, TestingModule } from '@nestjs/testing';
import { NotificationCategory, NotificationChannel, NotificationPriority } from '@prisma/client';
import { NotificationTemplateEntity } from '../../entities/notification-template.entity';
import { NotificationEntity } from '../../entities/notification.entity';
import { NotificationDispatchService } from '../../services/notification-dispatch.service';
import { NotificationTemplateService } from '../../services/notification-template.service';
import { NotificationAdminController } from '../notification-admin.controller';

describe('NotificationAdminController', () => {
  let controller: NotificationAdminController;
  let mockTemplateService: any;
  let mockDispatchService: any;

  const mockAdmin = { id: 'admin-1', role: 'SUPER_ADMIN' };

  const mockTemplate = new NotificationTemplateEntity({
    id: 'tmpl-1',
    salonId: null,
    templateCode: 'SYS_ALERT',
    channel: NotificationChannel.EMAIL,
    category: NotificationCategory.SYSTEM,
    bodyTemplate: 'Alert: {{message}}',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mockNotification = new NotificationEntity({
    id: 'notif-1',
    userId: 'user-1',
    salonId: null,
    channel: NotificationChannel.EMAIL,
    priority: NotificationPriority.HIGH,
    category: NotificationCategory.SYSTEM,
    title: 'Alert',
    body: 'System Maintenance Notice',
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
      renderTemplate: jest.fn().mockResolvedValue({ subject: 'Alert', body: 'Alert: Server Reboot' }),
      previewTemplate: jest.fn().mockResolvedValue({ subject: 'Alert', body: 'Alert: [message]' }),
    };

    mockDispatchService = {
      dispatch: jest.fn().mockResolvedValue(mockNotification),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationAdminController],
      providers: [
        { provide: NotificationTemplateService, useValue: mockTemplateService },
        { provide: NotificationDispatchService, useValue: mockDispatchService },
      ],
    }).compile();

    controller = module.get<NotificationAdminController>(NotificationAdminController);
  });

  describe('createTemplate', () => {
    it('should create platform template with salonId null', async () => {
      const result = await controller.createTemplate(mockAdmin, {
        templateCode: 'SYS_ALERT',
        channel: NotificationChannel.EMAIL,
        category: NotificationCategory.SYSTEM,
        bodyTemplate: 'Alert: {{message}}',
      });

      expect(result.data.templateCode).toBe('SYS_ALERT');
      expect(mockTemplateService.createTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ salonId: null }),
        'admin-1',
      );
    });
  });

  describe('searchTemplates', () => {
    it('should return paginated template list', async () => {
      const result = await controller.searchTemplates({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.pagination.total).toBe(1);
    });
  });

  describe('getTemplateById', () => {
    it('should return template by id', async () => {
      const result = await controller.getTemplateById('tmpl-1');

      expect(result.data.id).toBe('tmpl-1');
    });
  });

  describe('updateTemplate & activate & deactivate & delete', () => {
    it('should update template', async () => {
      const result = await controller.updateTemplate(mockAdmin, 'tmpl-1', {
        bodyTemplate: 'Updated: {{message}}',
      });

      expect(result.data).toBeDefined();
      expect(mockTemplateService.updateTemplate).toHaveBeenCalledWith(
        'tmpl-1',
        expect.any(Object),
        null,
        'admin-1',
      );
    });

    it('should activate template', async () => {
      const result = await controller.activateTemplate(mockAdmin, 'tmpl-1');
      expect(result.data).toBeDefined();
    });

    it('should deactivate template', async () => {
      const result = await controller.deactivateTemplate(mockAdmin, 'tmpl-1');
      expect(result.data).toBeDefined();
    });

    it('should delete template', async () => {
      const result = await controller.deleteTemplate(mockAdmin, 'tmpl-1');
      expect(result.data).toBeDefined();
    });
  });

  describe('renderTemplate & previewTemplate', () => {
    it('should render template', async () => {
      const result = await controller.renderTemplate('tmpl-1', {
        variables: { message: 'Server Reboot' },
      });

      expect(result.data.body).toBe('Alert: Server Reboot');
    });

    it('should preview template', async () => {
      const result = await controller.previewTemplate('tmpl-1', {});

      expect(result.data.body).toBe('Alert: [message]');
    });
  });

  describe('sendNotification & broadcastNotification', () => {
    it('should dispatch system notification', async () => {
      const result = await controller.sendNotification(mockAdmin, {
        userId: 'user-1',
        title: 'Alert',
        body: 'System Maintenance Notice',
      });

      expect(result.data.id).toBe('notif-1');
      expect(mockDispatchService.dispatch).toHaveBeenCalled();
    });

    it('should broadcast notification to multiple users', async () => {
      const result = await controller.broadcastNotification(mockAdmin, {
        userIds: ['user-1', 'user-2'],
        title: 'Platform Announcement',
        body: 'New features available!',
      });

      expect(result.data.totalTargeted).toBe(2);
      expect(result.data.successful).toBe(2);
    });
  });
});
