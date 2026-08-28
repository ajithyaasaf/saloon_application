import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationCategory, NotificationChannel, NotificationTemplate, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { NotificationTemplateRepository } from '../repositories/notification-template.repository';

describe('NotificationTemplateRepository', () => {
  let repository: NotificationTemplateRepository;
  let mockPrisma: any;

  const mockTemplate: NotificationTemplate = {
    id: 'tmpl-1',
    salonId: 'sal-1',
    templateCode: 'BOOKING_CONFIRMATION',
    channel: NotificationChannel.SMS,
    category: NotificationCategory.BOOKING,
    description: 'Booking confirmation SMS',
    subjectTemplate: null,
    bodyTemplate: 'Your booking {{bookingId}} is confirmed for {{time}}',
    variables: { bookingId: 'string', time: 'string' },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockGlobalTemplate: NotificationTemplate = {
    id: 'tmpl-global',
    salonId: null,
    templateCode: 'BOOKING_CONFIRMATION',
    channel: NotificationChannel.SMS,
    category: NotificationCategory.BOOKING,
    description: 'Global fallback confirmation',
    subjectTemplate: null,
    bodyTemplate: 'Global: booking {{bookingId}} confirmed',
    variables: { bookingId: 'string' },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    mockPrisma = {
      notificationTemplate: {
        findFirst: jest.fn().mockResolvedValue(mockTemplate),
        findMany: jest.fn().mockResolvedValue([mockTemplate]),
        findUnique: jest.fn().mockResolvedValue(mockTemplate),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue(mockTemplate),
        update: jest.fn().mockResolvedValue(mockTemplate),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationTemplateRepository,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    repository = module.get<NotificationTemplateRepository>(NotificationTemplateRepository);
  });

  describe('create', () => {
    it('should successfully create a template', async () => {
      const result = await repository.create({
        salonId: 'sal-1',
        templateCode: 'BOOKING_CONFIRMATION',
        channel: NotificationChannel.SMS,
        category: NotificationCategory.BOOKING,
        bodyTemplate: 'Your booking {{bookingId}} is confirmed',
      });

      expect(result).toBeDefined();
      expect(result.templateCode).toBe('BOOKING_CONFIRMATION');
      expect(mockPrisma.notificationTemplate.create).toHaveBeenCalled();
    });

    it('should throw ConflictException on duplicate template code', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique violation', {
        code: 'P2002',
        clientVersion: '5.22.0',
      });
      mockPrisma.notificationTemplate.create.mockRejectedValue(prismaError);

      await expect(
        repository.create({
          salonId: 'sal-1',
          templateCode: 'BOOKING_CONFIRMATION',
          channel: NotificationChannel.SMS,
          bodyTemplate: 'Duplicate template',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findById', () => {
    it('should find template by id with salon isolation', async () => {
      const result = await repository.findById('tmpl-1', 'sal-1');

      expect(result).toEqual(mockTemplate);
      expect(mockPrisma.notificationTemplate.findFirst).toHaveBeenCalledWith({
        where: { id: 'tmpl-1', deletedAt: null, salonId: 'sal-1' },
      });
    });

    it('should find platform-wide template when salonId is null', async () => {
      mockPrisma.notificationTemplate.findFirst.mockResolvedValue(mockGlobalTemplate);

      const result = await repository.findById('tmpl-global', null);

      expect(result).toEqual(mockGlobalTemplate);
      expect(mockPrisma.notificationTemplate.findFirst).toHaveBeenCalledWith({
        where: { id: 'tmpl-global', deletedAt: null, salonId: null },
      });
    });
  });

  describe('findByCode', () => {
    it('should query with salon priority ordering', async () => {
      await repository.findByCode('BOOKING_CONFIRMATION', 'sal-1');

      expect(mockPrisma.notificationTemplate.findFirst).toHaveBeenCalledWith({
        where: {
          templateCode: 'BOOKING_CONFIRMATION',
          deletedAt: null,
          OR: [{ salonId: 'sal-1' }, { salonId: null }],
        },
        orderBy: { salonId: 'desc' },
      });
    });
  });

  describe('findByCodeAndChannel', () => {
    it('should find template matching code and channel', async () => {
      await repository.findByCodeAndChannel(
        'BOOKING_CONFIRMATION',
        NotificationChannel.SMS,
        'sal-1',
      );

      expect(mockPrisma.notificationTemplate.findFirst).toHaveBeenCalledWith({
        where: {
          templateCode: 'BOOKING_CONFIRMATION',
          channel: NotificationChannel.SMS,
          deletedAt: null,
          OR: [{ salonId: 'sal-1' }, { salonId: null }],
        },
        orderBy: { salonId: 'desc' },
      });
    });
  });

  describe('findByChannel', () => {
    it('should return all templates for a specific channel', async () => {
      const results = await repository.findByChannel(NotificationChannel.SMS, 'sal-1');

      expect(results).toHaveLength(1);
      expect(mockPrisma.notificationTemplate.findMany).toHaveBeenCalledWith({
        where: { channel: NotificationChannel.SMS, deletedAt: null, salonId: 'sal-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findBySalon', () => {
    it('should return paginated salon templates', async () => {
      const result = await repository.findBySalon('sal-1', { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockPrisma.notificationTemplate.findMany).toHaveBeenCalledWith({
        where: { salonId: 'sal-1', deletedAt: null },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findActiveByCode', () => {
    it('should return active template by code', async () => {
      const result = await repository.findActiveByCode('BOOKING_CONFIRMATION', 'sal-1');

      expect(result).toEqual(mockTemplate);
      expect(mockPrisma.notificationTemplate.findFirst).toHaveBeenCalledWith({
        where: {
          templateCode: 'BOOKING_CONFIRMATION',
          isActive: true,
          deletedAt: null,
          OR: [{ salonId: 'sal-1' }, { salonId: null }],
        },
        orderBy: { salonId: 'desc' },
      });
    });
  });

  describe('search', () => {
    it('should search templates with text query and category filtering', async () => {
      const result = await repository.search({
        salonId: 'sal-1',
        category: NotificationCategory.BOOKING,
        search: 'confirmation',
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockPrisma.notificationTemplate.findMany).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update template fields', async () => {
      const updated = { ...mockTemplate, bodyTemplate: 'Updated template text' };
      mockPrisma.notificationTemplate.update.mockResolvedValue(updated);

      const result = await repository.update('tmpl-1', {
        bodyTemplate: 'Updated template text',
      });

      expect(result?.bodyTemplate).toBe('Updated template text');
      expect(mockPrisma.notificationTemplate.update).toHaveBeenCalled();
    });

    it('should return null if template not found', async () => {
      mockPrisma.notificationTemplate.findFirst.mockResolvedValue(null);

      const result = await repository.update('non-existent', { bodyTemplate: 'text' });

      expect(result).toBeNull();
    });
  });

  describe('activate & deactivate', () => {
    it('should activate template', async () => {
      await repository.activate('tmpl-1', 'sal-1');

      expect(mockPrisma.notificationTemplate.update).toHaveBeenCalledWith({
        where: { id: 'tmpl-1' },
        data: { isActive: true },
      });
    });

    it('should deactivate template', async () => {
      await repository.deactivate('tmpl-1', 'sal-1');

      expect(mockPrisma.notificationTemplate.update).toHaveBeenCalledWith({
        where: { id: 'tmpl-1' },
        data: { isActive: false },
      });
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt and deactivate', async () => {
      await repository.softDelete('tmpl-1', 'sal-1');

      expect(mockPrisma.notificationTemplate.update).toHaveBeenCalledWith({
        where: { id: 'tmpl-1' },
        data: expect.objectContaining({
          isActive: false,
          deletedAt: expect.any(Date),
        }),
      });
    });
  });

  describe('checkCodeExists', () => {
    it('should return true if code exists', async () => {
      mockPrisma.notificationTemplate.count.mockResolvedValue(1);

      const exists = await repository.checkCodeExists('BOOKING_CONFIRMATION', 'sal-1');
      expect(exists).toBe(true);
    });

    it('should return false if code does not exist', async () => {
      mockPrisma.notificationTemplate.count.mockResolvedValue(0);

      const exists = await repository.checkCodeExists('NEW_CODE', 'sal-1');
      expect(exists).toBe(false);
    });
  });
});
