import { ConflictException, Injectable } from '@nestjs/common';
import { NotificationChannel, NotificationTemplate, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  CreateNotificationTemplateData,
  SearchNotificationTemplateQueryDto,
  UpdateNotificationTemplateData,
} from '../dto/notification-template.dto';
import { INotificationTemplateRepository } from './interfaces/notification-template.repository.interface';

@Injectable()
export class NotificationTemplateRepository implements INotificationTemplateRepository {
  constructor(private readonly db: PrismaService) {}

  public async findById(id: string, salonId?: string | null): Promise<NotificationTemplate | null> {
    const where: Prisma.NotificationTemplateWhereInput = {
      id,
      deletedAt: null,
    };
    if (salonId !== undefined) {
      where.salonId = salonId;
    }

    return this.db.notificationTemplate.findFirst({
      where,
    });
  }

  public async findByCode(code: string, salonId?: string | null): Promise<NotificationTemplate | null> {
    const where: Prisma.NotificationTemplateWhereInput = {
      templateCode: code,
      deletedAt: null,
    };
    if (salonId !== undefined) {
      where.OR = [{ salonId }, { salonId: null }];
    }

    // If salonId provided, order by salonId desc (non-null first) to prioritize salon override
    return this.db.notificationTemplate.findFirst({
      where,
      orderBy: { salonId: 'desc' },
    });
  }

  public async findByCodeAndChannel(
    code: string,
    channel: NotificationChannel,
    salonId?: string | null,
  ): Promise<NotificationTemplate | null> {
    const where: Prisma.NotificationTemplateWhereInput = {
      templateCode: code,
      channel,
      deletedAt: null,
    };
    if (salonId !== undefined) {
      where.OR = [{ salonId }, { salonId: null }];
    }

    return this.db.notificationTemplate.findFirst({
      where,
      orderBy: { salonId: 'desc' },
    });
  }

  public async findByChannel(
    channel: NotificationChannel,
    salonId?: string | null,
  ): Promise<NotificationTemplate[]> {
    const where: Prisma.NotificationTemplateWhereInput = {
      channel,
      deletedAt: null,
    };
    if (salonId !== undefined) {
      where.salonId = salonId;
    }

    return this.db.notificationTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findBySalon(
    salonId: string | null,
    options?: { page?: number; limit?: number },
  ): Promise<{ data: NotificationTemplate[]; total: number }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationTemplateWhereInput = {
      salonId,
      deletedAt: null,
    };

    const [data, total] = await Promise.all([
      this.db.notificationTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.notificationTemplate.count({ where }),
    ]);

    return { data, total };
  }

  public async findActiveByCode(
    code: string,
    salonId?: string | null,
  ): Promise<NotificationTemplate | null> {
    const where: Prisma.NotificationTemplateWhereInput = {
      templateCode: code,
      isActive: true,
      deletedAt: null,
    };
    if (salonId !== undefined) {
      where.OR = [{ salonId }, { salonId: null }];
    }

    return this.db.notificationTemplate.findFirst({
      where,
      orderBy: { salonId: 'desc' },
    });
  }

  public async search(
    query: SearchNotificationTemplateQueryDto,
  ): Promise<{ data: NotificationTemplate[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationTemplateWhereInput = {
      deletedAt: null,
    };

    if (query.salonId !== undefined) {
      where.salonId = query.salonId;
    }
    if (query.channel) {
      where.channel = query.channel;
    }
    if (query.category) {
      where.category = query.category;
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }
    if (query.search) {
      where.OR = [
        { templateCode: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { subjectTemplate: { contains: query.search, mode: 'insensitive' } },
        { bodyTemplate: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.db.notificationTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.notificationTemplate.count({ where }),
    ]);

    return { data, total };
  }

  public async count(where?: Prisma.NotificationTemplateWhereInput): Promise<number> {
    return this.db.notificationTemplate.count({
      where: {
        ...where,
        deletedAt: null,
      },
    });
  }

  public async create(data: CreateNotificationTemplateData): Promise<NotificationTemplate> {
    try {
      return await this.db.notificationTemplate.create({
        data: {
          salonId: data.salonId ?? null,
          templateCode: data.templateCode,
          channel: data.channel,
          category: data.category ?? 'SYSTEM',
          description: data.description ?? null,
          subjectTemplate: data.subjectTemplate ?? null,
          bodyTemplate: data.bodyTemplate,
          variables: (data.variables as Prisma.InputJsonValue) ?? Prisma.JsonNull,
          isActive: data.isActive ?? true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          `Notification template with code '${data.templateCode}' already exists for this scope`,
        );
      }
      throw error;
    }
  }

  public async update(
    id: string,
    data: UpdateNotificationTemplateData,
    salonId?: string | null,
  ): Promise<NotificationTemplate | null> {
    const where: Prisma.NotificationTemplateWhereUniqueInput = { id };
    const existing = await this.findById(id, salonId);
    if (!existing) {
      return null;
    }

    const updateData: Prisma.NotificationTemplateUpdateInput = {};
    if (data.templateCode !== undefined) updateData.templateCode = data.templateCode;
    if (data.channel !== undefined) updateData.channel = data.channel;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.subjectTemplate !== undefined) updateData.subjectTemplate = data.subjectTemplate;
    if (data.bodyTemplate !== undefined) updateData.bodyTemplate = data.bodyTemplate;
    if (data.variables !== undefined) {
      updateData.variables = (data.variables as Prisma.InputJsonValue) ?? Prisma.JsonNull;
    }
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    try {
      return await this.db.notificationTemplate.update({
        where,
        data: updateData,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          `Notification template with code '${data.templateCode}' already exists for this scope`,
        );
      }
      throw error;
    }
  }

  public async activate(id: string, salonId?: string | null): Promise<NotificationTemplate | null> {
    const existing = await this.findById(id, salonId);
    if (!existing) return null;

    return this.db.notificationTemplate.update({
      where: { id },
      data: { isActive: true },
    });
  }

  public async deactivate(id: string, salonId?: string | null): Promise<NotificationTemplate | null> {
    const existing = await this.findById(id, salonId);
    if (!existing) return null;

    return this.db.notificationTemplate.update({
      where: { id },
      data: { isActive: false },
    });
  }

  public async softDelete(id: string, salonId?: string | null): Promise<NotificationTemplate | null> {
    const existing = await this.findById(id, salonId);
    if (!existing) return null;

    return this.db.notificationTemplate.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  public async checkCodeExists(
    code: string,
    salonId?: string | null,
    excludeId?: string,
  ): Promise<boolean> {
    const where: Prisma.NotificationTemplateWhereInput = {
      templateCode: code,
      deletedAt: null,
    };
    if (salonId !== undefined) {
      where.salonId = salonId;
    }
    if (excludeId) {
      where.id = { not: excludeId };
    }

    const count = await this.db.notificationTemplate.count({ where });
    return count > 0;
  }
}
