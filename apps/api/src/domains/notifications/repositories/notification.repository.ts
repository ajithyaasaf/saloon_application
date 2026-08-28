import { ConflictException, Injectable } from '@nestjs/common';
import { Notification, NotificationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CreateNotificationData, SearchNotificationQueryDto, UpdateNotificationData } from '../dto/notification.dto';
import { INotificationRepository } from './interfaces/notification.repository.interface';

@Injectable()
export class NotificationRepository implements INotificationRepository {
  constructor(private readonly db: PrismaService) {}

  public async findById(id: string): Promise<Notification | null> {
    return this.db.notification.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        template: true,
        deliveries: true,
      },
    });
  }

  public async findByUser(
    userId: string,
    options?: { page?: number; limit?: number; isRead?: boolean },
  ): Promise<{ data: Notification[]; total: number }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      userId,
      deletedAt: null,
    };

    if (options?.isRead === true) {
      where.readAt = { not: null };
    } else if (options?.isRead === false) {
      where.readAt = null;
    }

    const [data, total] = await Promise.all([
      this.db.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          template: true,
          deliveries: true,
        },
      }),
      this.db.notification.count({ where }),
    ]);

    return { data, total };
  }

  public async findBySalon(
    salonId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{ data: Notification[]; total: number }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      salonId,
      deletedAt: null,
    };

    const [data, total] = await Promise.all([
      this.db.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          template: true,
          deliveries: true,
        },
      }),
      this.db.notification.count({ where }),
    ]);

    return { data, total };
  }

  public async findByUserAndId(userId: string, id: string): Promise<Notification | null> {
    return this.db.notification.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
      include: {
        template: true,
        deliveries: true,
      },
    });
  }

  public async findByIdempotencyKey(key: string): Promise<Notification | null> {
    return this.db.notification.findFirst({
      where: {
        idempotencyKey: key,
        deletedAt: null,
      },
      include: {
        template: true,
        deliveries: true,
      },
    });
  }

  public async create(data: CreateNotificationData): Promise<Notification> {
    try {
      return await this.db.notification.create({
        data: {
          salonId: data.salonId ?? null,
          userId: data.userId,
          templateId: data.templateId ?? null,
          channel: data.channel ?? 'PUSH',
          priority: data.priority ?? 'NORMAL',
          category: data.category ?? 'SYSTEM',
          title: data.title,
          body: data.body,
          idempotencyKey: data.idempotencyKey ?? null,
          metadata: (data.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
          scheduledAt: data.scheduledAt ?? null,
          readAt: data.readAt ?? null,
        },
        include: {
          template: true,
          deliveries: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          `Notification with idempotency key '${data.idempotencyKey}' already exists`,
        );
      }
      throw error;
    }
  }

  public async update(id: string, data: UpdateNotificationData): Promise<Notification | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updateData: Prisma.NotificationUpdateInput = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.body !== undefined) updateData.body = data.body;
    if (data.metadata !== undefined) {
      updateData.metadata = (data.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull;
    }
    if (data.readAt !== undefined) updateData.readAt = data.readAt;

    return this.db.notification.update({
      where: { id },
      data: updateData,
      include: {
        template: true,
        deliveries: true,
      },
    });
  }

  public async updateStatus(id: string, status: NotificationStatus): Promise<Notification | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    return this.db.notification.update({
      where: { id },
      data: {
        deliveries: {
          updateMany: {
            where: { notificationId: id },
            data: { status },
          },
        },
      },
      include: {
        template: true,
        deliveries: true,
      },
    });
  }

  public async markRead(id: string, userId?: string): Promise<Notification | null> {
    const where: Prisma.NotificationWhereInput = {
      id,
      deletedAt: null,
    };
    if (userId) {
      where.userId = userId;
    }

    const existing = await this.db.notification.findFirst({ where });
    if (!existing) return null;

    return this.db.notification.update({
      where: { id },
      data: { readAt: new Date() },
      include: {
        template: true,
        deliveries: true,
      },
    });
  }

  public async markUnread(id: string, userId?: string): Promise<Notification | null> {
    const where: Prisma.NotificationWhereInput = {
      id,
      deletedAt: null,
    };
    if (userId) {
      where.userId = userId;
    }

    const existing = await this.db.notification.findFirst({ where });
    if (!existing) return null;

    return this.db.notification.update({
      where: { id },
      data: { readAt: null },
      include: {
        template: true,
        deliveries: true,
      },
    });
  }

  public async markAllRead(userId: string): Promise<number> {
    const result = await this.db.notification.updateMany({
      where: {
        userId,
        readAt: null,
        deletedAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return result.count;
  }

  public async softDelete(id: string, userId?: string): Promise<Notification | null> {
    const where: Prisma.NotificationWhereInput = {
      id,
      deletedAt: null,
    };
    if (userId) {
      where.userId = userId;
    }

    const existing = await this.db.notification.findFirst({ where });
    if (!existing) return null;

    return this.db.notification.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: {
        template: true,
        deliveries: true,
      },
    });
  }

  public async countUnread(userId: string): Promise<number> {
    return this.db.notification.count({
      where: {
        userId,
        readAt: null,
        deletedAt: null,
      },
    });
  }

  public async search(
    query: SearchNotificationQueryDto,
  ): Promise<{ data: Notification[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      deletedAt: null,
    };

    if (query.userId) {
      where.userId = query.userId;
    }
    if (query.salonId) {
      where.salonId = query.salonId;
    }
    if (query.channel) {
      where.channel = query.channel;
    }
    if (query.priority) {
      where.priority = query.priority;
    }
    if (query.category) {
      where.category = query.category;
    }
    if (query.isRead === true) {
      where.readAt = { not: null };
    } else if (query.isRead === false) {
      where.readAt = null;
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = query.startDate;
      if (query.endDate) where.createdAt.lte = query.endDate;
    }

    const [data, total] = await Promise.all([
      this.db.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          template: true,
          deliveries: true,
        },
      }),
      this.db.notification.count({ where }),
    ]);

    return { data, total };
  }

  public async count(where?: Prisma.NotificationWhereInput): Promise<number> {
    return this.db.notification.count({
      where: {
        ...where,
        deletedAt: null,
      },
    });
  }
}
