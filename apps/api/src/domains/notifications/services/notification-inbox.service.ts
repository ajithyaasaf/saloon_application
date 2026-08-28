import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationCategory } from '@prisma/client';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { NotificationEntity } from '../entities/notification.entity';
import { NotificationDeletedEvent, NotificationReadEvent } from '../events/notification.events';
import { NotificationRepository } from '../repositories/notification.repository';

@Injectable()
export class NotificationInboxService {
  private readonly logger = new Logger(NotificationInboxService.name);

  constructor(
    private readonly notificationRepo: NotificationRepository,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBus: EventBusService,
  ) {}

  public async getInbox(
    userId: string,
    options?: {
      page?: number;
      limit?: number;
      isRead?: boolean;
      category?: NotificationCategory;
    },
  ): Promise<{ data: NotificationEntity[]; total: number; unreadCount: number }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;

    const [paginated, unreadCount] = await Promise.all([
      this.notificationRepo.search({
        userId,
        category: options?.category,
        isRead: options?.isRead,
        page,
        limit,
      }),
      this.getUnreadCount(userId),
    ]);

    return {
      data: paginated.data.map((n) => new NotificationEntity(n)),
      total: paginated.total,
      unreadCount,
    };
  }

  public async getNotificationById(id: string, userId: string): Promise<NotificationEntity> {
    const notif = await this.notificationRepo.findByUserAndId(userId, id);
    if (!notif) {
      throw new NotFoundException(`Notification '${id}' not found for user '${userId}'.`);
    }

    return new NotificationEntity(notif);
  }

  public async markAsRead(
    id: string,
    userId: string,
    actorId?: string,
  ): Promise<NotificationEntity> {
    const existing = await this.getNotificationById(id, userId);

    const updated = await this.notificationRepo.markRead(id, userId);
    if (!updated) {
      throw new NotFoundException(`Failed to mark notification '${id}' as read.`);
    }

    const entity = new NotificationEntity(updated);

    // Invalidate Cache
    await this.invalidateInboxCache(userId);

    // Audit Logging
    await this.auditService.log({
      action: 'UPDATE',
      entityType: 'Notification',
      entityId: entity.id,
      actorId,
      newState: { readAt: entity.readAt },
    });

    // Domain Event
    await this.eventBus.publish(
      new NotificationReadEvent(
        {
          notificationId: entity.id,
          userId: entity.userId,
          readAt: entity.readAt!,
        },
        actorId,
      ),
    );

    return entity;
  }

  public async markAsUnread(
    id: string,
    userId: string,
    actorId?: string,
  ): Promise<NotificationEntity> {
    await this.getNotificationById(id, userId);

    const updated = await this.notificationRepo.markUnread(id, userId);
    if (!updated) {
      throw new NotFoundException(`Failed to mark notification '${id}' as unread.`);
    }

    const entity = new NotificationEntity(updated);
    await this.invalidateInboxCache(userId);

    await this.auditService.log({
      action: 'UPDATE',
      entityType: 'Notification',
      entityId: entity.id,
      actorId,
      newState: { readAt: null },
    });

    return entity;
  }

  public async markAllAsRead(
    userId: string,
    actorId?: string,
  ): Promise<{ updatedCount: number }> {
    const updatedCount = await this.notificationRepo.markAllRead(userId);
    await this.invalidateInboxCache(userId);

    await this.auditService.log({
      action: 'UPDATE',
      entityType: 'Notification',
      entityId: userId,
      actorId,
      newState: { allReadCount: updatedCount },
    });

    return { updatedCount };
  }

  public async deleteNotification(
    id: string,
    userId: string,
    actorId?: string,
  ): Promise<NotificationEntity> {
    await this.getNotificationById(id, userId);

    const deleted = await this.notificationRepo.softDelete(id, userId);
    if (!deleted) {
      throw new NotFoundException(`Failed to delete notification '${id}'.`);
    }

    const entity = new NotificationEntity(deleted);
    await this.invalidateInboxCache(userId);

    await this.auditService.log({
      action: 'DELETE',
      entityType: 'Notification',
      entityId: entity.id,
      actorId,
    });

    await this.eventBus.publish(
      new NotificationDeletedEvent(
        {
          notificationId: entity.id,
          userId: entity.userId,
        },
        actorId,
      ),
    );

    return entity;
  }

  public async getUnreadCount(userId: string): Promise<number> {
    const cacheKey = `notification-inbox:${userId}:unread`;
    const cached = await this.cacheService.get<number>(cacheKey);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const count = await this.notificationRepo.countUnread(userId);
    await this.cacheService.set(cacheKey, count, 60); // 60s TTL
    return count;
  }

  // ─── Cache Helpers ──────────────────────────────────────────────────────────

  private async invalidateInboxCache(userId: string): Promise<void> {
    await this.cacheService.delete(`notification-inbox:${userId}:unread`);
    await this.cacheService.deleteByPattern(`user:${userId}:notifications*`);
  }
}
