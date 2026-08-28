import { Injectable } from '@nestjs/common';
import { NotificationDelivery, NotificationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  CreateNotificationDeliveryData,
  SearchNotificationDeliveryQueryDto,
  UpdateNotificationDeliveryData,
} from '../dto/notification-delivery.dto';
import { INotificationDeliveryRepository } from './interfaces/notification-delivery.repository.interface';

@Injectable()
export class NotificationDeliveryRepository implements INotificationDeliveryRepository {
  constructor(private readonly db: PrismaService) {}

  public async findById(id: string): Promise<NotificationDelivery | null> {
    return this.db.notificationDelivery.findUnique({
      where: { id },
      include: {
        notification: true,
      },
    });
  }

  public async findByNotification(notificationId: string): Promise<NotificationDelivery[]> {
    return this.db.notificationDelivery.findMany({
      where: { notificationId },
      orderBy: { createdAt: 'asc' },
      include: {
        notification: true,
      },
    });
  }

  public async findByProviderMessageId(providerMessageId: string): Promise<NotificationDelivery | null> {
    return this.db.notificationDelivery.findFirst({
      where: { providerMessageId },
      include: {
        notification: true,
      },
    });
  }

  public async findPendingRetries(limit = 50, beforeDate: Date = new Date()): Promise<NotificationDelivery[]> {
    return this.db.notificationDelivery.findMany({
      where: {
        status: NotificationStatus.FAILED,
        retryCount: { lt: 3 },
        nextRetryAt: { lte: beforeDate },
      },
      take: limit,
      orderBy: { nextRetryAt: 'asc' },
      include: {
        notification: true,
      },
    });
  }

  public async findByStatus(status: NotificationStatus, limit = 100): Promise<NotificationDelivery[]> {
    return this.db.notificationDelivery.findMany({
      where: { status },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        notification: true,
      },
    });
  }

  public async create(data: CreateNotificationDeliveryData): Promise<NotificationDelivery> {
    return this.db.notificationDelivery.create({
      data: {
        notificationId: data.notificationId,
        channel: data.channel,
        status: data.status ?? NotificationStatus.QUEUED,
        providerMessageId: data.providerMessageId ?? null,
        sentAt: data.sentAt ?? null,
        deliveredAt: data.deliveredAt ?? null,
        readAt: data.readAt ?? null,
        failedReason: data.failedReason ?? null,
        externalMetadata: (data.externalMetadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        retryCount: data.retryCount ?? 0,
        nextRetryAt: data.nextRetryAt ?? null,
      },
      include: {
        notification: true,
      },
    });
  }

  public async update(
    id: string,
    data: UpdateNotificationDeliveryData,
  ): Promise<NotificationDelivery | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updateData: Prisma.NotificationDeliveryUpdateInput = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.providerMessageId !== undefined) updateData.providerMessageId = data.providerMessageId;
    if (data.sentAt !== undefined) updateData.sentAt = data.sentAt;
    if (data.deliveredAt !== undefined) updateData.deliveredAt = data.deliveredAt;
    if (data.readAt !== undefined) updateData.readAt = data.readAt;
    if (data.failedReason !== undefined) updateData.failedReason = data.failedReason;
    if (data.externalMetadata !== undefined) {
      updateData.externalMetadata =
        (data.externalMetadata as Prisma.InputJsonValue) ?? Prisma.JsonNull;
    }
    if (data.retryCount !== undefined) updateData.retryCount = data.retryCount;
    if (data.nextRetryAt !== undefined) updateData.nextRetryAt = data.nextRetryAt;

    return this.db.notificationDelivery.update({
      where: { id },
      data: updateData,
      include: {
        notification: true,
      },
    });
  }

  public async updateStatus(
    id: string,
    status: NotificationStatus,
    failedReason?: string,
  ): Promise<NotificationDelivery | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const data: Prisma.NotificationDeliveryUpdateInput = { status };
    if (failedReason !== undefined) {
      data.failedReason = failedReason;
    }

    return this.db.notificationDelivery.update({
      where: { id },
      data,
      include: {
        notification: true,
      },
    });
  }

  public async updateProviderMessageId(
    id: string,
    providerMessageId: string,
  ): Promise<NotificationDelivery | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    return this.db.notificationDelivery.update({
      where: { id },
      data: { providerMessageId },
      include: {
        notification: true,
      },
    });
  }

  public async updateDeliveryMetadata(
    id: string,
    externalMetadata: Record<string, unknown>,
  ): Promise<NotificationDelivery | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    return this.db.notificationDelivery.update({
      where: { id },
      data: {
        externalMetadata: (externalMetadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      },
      include: {
        notification: true,
      },
    });
  }

  public async scheduleRetry(
    id: string,
    nextRetryAt: Date,
    incrementCount = true,
  ): Promise<NotificationDelivery | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const data: Prisma.NotificationDeliveryUpdateInput = {
      nextRetryAt,
      status: NotificationStatus.FAILED,
    };
    if (incrementCount) {
      data.retryCount = { increment: 1 };
    }

    return this.db.notificationDelivery.update({
      where: { id },
      data,
      include: {
        notification: true,
      },
    });
  }

  public async incrementRetryCount(id: string): Promise<NotificationDelivery | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    return this.db.notificationDelivery.update({
      where: { id },
      data: {
        retryCount: { increment: 1 },
      },
      include: {
        notification: true,
      },
    });
  }

  public async markSent(id: string, providerMessageId?: string): Promise<NotificationDelivery | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const data: Prisma.NotificationDeliveryUpdateInput = {
      status: NotificationStatus.SENT,
      sentAt: new Date(),
    };
    if (providerMessageId) {
      data.providerMessageId = providerMessageId;
    }

    return this.db.notificationDelivery.update({
      where: { id },
      data,
      include: {
        notification: true,
      },
    });
  }

  public async markDelivered(id: string, deliveredAt?: Date): Promise<NotificationDelivery | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    return this.db.notificationDelivery.update({
      where: { id },
      data: {
        status: NotificationStatus.DELIVERED,
        deliveredAt: deliveredAt ?? new Date(),
      },
      include: {
        notification: true,
      },
    });
  }

  public async markFailed(id: string, reason: string): Promise<NotificationDelivery | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    return this.db.notificationDelivery.update({
      where: { id },
      data: {
        status: NotificationStatus.FAILED,
        failedReason: reason,
      },
      include: {
        notification: true,
      },
    });
  }

  public async search(
    query: SearchNotificationDeliveryQueryDto,
  ): Promise<{ data: NotificationDelivery[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationDeliveryWhereInput = {};
    if (query.notificationId) {
      where.notificationId = query.notificationId;
    }
    if (query.channel) {
      where.channel = query.channel;
    }
    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.db.notificationDelivery.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          notification: true,
        },
      }),
      this.db.notificationDelivery.count({ where }),
    ]);

    return { data, total };
  }
}
