import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationCategory, NotificationChannel, NotificationTemplate } from '@prisma/client';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { NotificationTemplateEntity } from '../entities/notification-template.entity';
import { NotificationTemplateRepository } from '../repositories/notification-template.repository';
import { NotificationTemplateService } from '../services/notification-template.service';

describe('NotificationTemplateService', () => {
  let service: NotificationTemplateService;
  let mockTemplateRepo: any;
  let mockAuditService: any;
  let mockCacheService: any;
  let mockEventBus: any;

  const mockTemplate: NotificationTemplate = {
    id: 'tmpl-1',
    salonId: 'sal-1',
    templateCode: 'APPOINTMENT_REMINDER',
    channel: NotificationChannel.SMS,
    category: NotificationCategory.REMINDERS,
    description: 'Reminder SMS for customer',
    subjectTemplate: null,
    bodyTemplate: 'Hi {{customerName}}, your appointment is at {{time}}.',
    variables: { customerName: 'string', time: 'string' },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockGlobalTemplate: NotificationTemplate = {
    id: 'tmpl-global',
    salonId: null,
    templateCode: 'APPOINTMENT_REMINDER',
    channel: NotificationChannel.SMS,
    category: NotificationCategory.REMINDERS,
    description: 'Global fallback reminder',
    subjectTemplate: null,
    bodyTemplate: 'Hello {{customerName}}, you have an appointment at {{time}}.',
    variables: { customerName: 'string', time: 'string' },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    mockTemplateRepo = {
      findById: jest.fn().mockResolvedValue(mockTemplate),
      findByCodeAndChannel: jest.fn().mockResolvedValue(mockTemplate),
      checkCodeExists: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockResolvedValue(mockTemplate),
      update: jest.fn().mockResolvedValue(mockTemplate),
      activate: jest.fn().mockResolvedValue({ ...mockTemplate, isActive: true }),
      deactivate: jest.fn().mockResolvedValue({ ...mockTemplate, isActive: false }),
      softDelete: jest.fn().mockResolvedValue({ ...mockTemplate, deletedAt: new Date() }),
      search: jest.fn().mockResolvedValue({ data: [mockTemplate], total: 1 }),
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
        NotificationTemplateService,
        { provide: NotificationTemplateRepository, useValue: mockTemplateRepo },
        { provide: AuditService, useValue: mockAuditService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<NotificationTemplateService>(NotificationTemplateService);
  });

  describe('createTemplate', () => {
    it('should create template, invalidate cache, log audit, and publish event', async () => {
      const result = await service.createTemplate(
        {
          salonId: 'sal-1',
          templateCode: 'APPOINTMENT_REMINDER',
          channel: NotificationChannel.SMS,
          category: NotificationCategory.REMINDERS,
          bodyTemplate: 'Hi {{customerName}}, your appointment is at {{time}}.',
        },
        'user-1',
      );

      expect(result).toBeInstanceOf(NotificationTemplateEntity);
      expect(result.templateCode).toBe('APPOINTMENT_REMINDER');
      expect(mockCacheService.deleteByPattern).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE', entityType: 'NotificationTemplate' }),
      );
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should reject invalid template code format', async () => {
      await expect(
        service.createTemplate({
          templateCode: 'invalid code!',
          channel: NotificationChannel.SMS,
          bodyTemplate: 'Test',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject empty body template', async () => {
      await expect(
        service.createTemplate({
          templateCode: 'VALID_CODE',
          channel: NotificationChannel.SMS,
          bodyTemplate: '   ',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate code in scope', async () => {
      mockTemplateRepo.checkCodeExists.mockResolvedValue(true);

      await expect(
        service.createTemplate({
          salonId: 'sal-1',
          templateCode: 'APPOINTMENT_REMINDER',
          channel: NotificationChannel.SMS,
          bodyTemplate: 'Test body',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateTemplate', () => {
    it('should update template successfully', async () => {
      const result = await service.updateTemplate(
        'tmpl-1',
        { bodyTemplate: 'Updated text {{customerName}}' },
        'sal-1',
        'user-1',
      );

      expect(result).toBeDefined();
      expect(mockTemplateRepo.update).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE' }),
      );
    });

    it('should prevent cross-salon modifications', async () => {
      await expect(
        service.updateTemplate('tmpl-1', { bodyTemplate: 'Hacked' }, 'sal-other', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('resolveTemplate', () => {
    it('should return active template', async () => {
      const template = await service.resolveTemplate(
        'APPOINTMENT_REMINDER',
        NotificationChannel.SMS,
        'sal-1',
      );

      expect(template).toBeDefined();
      expect(template.templateCode).toBe('APPOINTMENT_REMINDER');
    });

    it('should throw NotFoundException if template is not found or inactive', async () => {
      mockTemplateRepo.findByCodeAndChannel.mockResolvedValue(null);

      await expect(
        service.resolveTemplate('NON_EXISTENT', NotificationChannel.SMS, 'sal-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('renderTemplate', () => {
    it('should render template with interpolated variables', async () => {
      const result = await service.renderTemplate('tmpl-1', {
        customerName: 'Alice',
        time: '3:00 PM',
      });

      expect(result.body).toBe('Hi Alice, your appointment is at 3:00 PM.');
    });

    it('should throw BadRequestException on missing required variables', async () => {
      await expect(
        service.renderTemplate('tmpl-1', { customerName: 'Alice' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('previewTemplate', () => {
    it('should render preview with fallback placeholders for missing variables', async () => {
      const result = await service.previewTemplate('tmpl-1', { customerName: 'Alice' });

      expect(result.body).toBe('Hi Alice, your appointment is at [time].');
    });
  });

  describe('activate & deactivate & softDelete', () => {
    it('should activate template', async () => {
      const result = await service.activateTemplate('tmpl-1', 'sal-1', 'user-1');
      expect(result.isActive).toBe(true);
    });

    it('should deactivate template', async () => {
      const result = await service.deactivateTemplate('tmpl-1', 'sal-1', 'user-1');
      expect(result.isActive).toBe(false);
    });

    it('should soft delete template', async () => {
      const result = await service.softDeleteTemplate('tmpl-1', 'sal-1', 'user-1');
      expect(result).toBeDefined();
    });
  });
});
