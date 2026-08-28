import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, NotificationPriority } from '@prisma/client';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { UpsertNotificationPreferenceData } from '../dto/notification-preference.dto';
import { UserNotificationPreferenceEntity } from '../entities/user-notification-preference.entity';
import { NotificationPreferenceUpdatedEvent } from '../events/notification.events';
import { UserNotificationPreferenceRepository } from '../repositories/user-notification-preference.repository';

const ALL_CHANNELS: NotificationChannel[] = [
  NotificationChannel.PUSH,
  NotificationChannel.SMS,
  NotificationChannel.WHATSAPP,
  NotificationChannel.EMAIL,
  NotificationChannel.IN_APP,
];

@Injectable()
export class NotificationPreferenceService {
  private readonly logger = new Logger(NotificationPreferenceService.name);

  constructor(
    private readonly preferenceRepo: UserNotificationPreferenceRepository,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBus: EventBusService,
  ) {}

  public async getUserPreferences(userId: string): Promise<UserNotificationPreferenceEntity[]> {
    const stored = await this.preferenceRepo.findByUser(userId);
    const storedMap = new Map<NotificationChannel, UserNotificationPreferenceEntity>(
      stored.map((p) => [p.channel, new UserNotificationPreferenceEntity(p)]),
    );

    // Return complete matrix across all available channels
    return ALL_CHANNELS.map((channel) => {
      if (storedMap.has(channel)) {
        return storedMap.get(channel)!;
      }
      return new UserNotificationPreferenceEntity({
        userId,
        channel,
        isEnabled: true,
        quietHoursEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
      });
    });
  }

  public async getPreferenceByChannel(
    userId: string,
    channel: NotificationChannel,
  ): Promise<UserNotificationPreferenceEntity> {
    const stored = await this.preferenceRepo.findByUserAndChannel(userId, channel);
    if (stored) {
      return new UserNotificationPreferenceEntity(stored);
    }

    return new UserNotificationPreferenceEntity({
      userId,
      channel,
      isEnabled: true,
      quietHoursEnabled: false,
      quietHoursStart: null,
      quietHoursEnd: null,
    });
  }

  public async updatePreference(
    data: UpsertNotificationPreferenceData,
    actorId?: string,
  ): Promise<UserNotificationPreferenceEntity> {
    this.validateQuietHours(data.quietHoursStart, data.quietHoursEnd);

    const upserted = await this.preferenceRepo.upsert(data);
    const entity = new UserNotificationPreferenceEntity(upserted);

    // Invalidate Cache
    await this.cacheService.delete(`notification-preferences:${data.userId}`);

    // Audit Logging
    await this.auditService.log({
      action: 'UPDATE',
      entityType: 'UserNotificationPreference',
      entityId: entity.id,
      actorId,
      newState: {
        userId: entity.userId,
        channel: entity.channel,
        isEnabled: entity.isEnabled,
        quietHoursEnabled: entity.quietHoursEnabled,
        quietHoursStart: entity.quietHoursStart,
        quietHoursEnd: entity.quietHoursEnd,
      },
    });

    // Domain Event
    await this.eventBus.publish(
      new NotificationPreferenceUpdatedEvent(
        {
          userId: entity.userId,
          channel: entity.channel,
          isEnabled: entity.isEnabled,
          quietHoursEnabled: entity.quietHoursEnabled,
          quietHoursStart: entity.quietHoursStart,
          quietHoursEnd: entity.quietHoursEnd,
        },
        actorId,
      ),
    );

    return entity;
  }

  public async enableChannel(
    userId: string,
    channel: NotificationChannel,
    actorId?: string,
  ): Promise<UserNotificationPreferenceEntity> {
    return this.updatePreference({ userId, channel, isEnabled: true }, actorId);
  }

  public async disableChannel(
    userId: string,
    channel: NotificationChannel,
    actorId?: string,
  ): Promise<UserNotificationPreferenceEntity> {
    return this.updatePreference({ userId, channel, isEnabled: false }, actorId);
  }

  public async setQuietHours(
    userId: string,
    channel: NotificationChannel,
    start: string,
    end: string,
    actorId?: string,
  ): Promise<UserNotificationPreferenceEntity> {
    return this.updatePreference(
      {
        userId,
        channel,
        quietHoursEnabled: true,
        quietHoursStart: start,
        quietHoursEnd: end,
      },
      actorId,
    );
  }

  public async removeQuietHours(
    userId: string,
    channel: NotificationChannel,
    actorId?: string,
  ): Promise<UserNotificationPreferenceEntity> {
    return this.updatePreference(
      {
        userId,
        channel,
        quietHoursEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
      },
      actorId,
    );
  }

  public async canDeliver(
    userId: string,
    channel: NotificationChannel,
    priority: NotificationPriority = NotificationPriority.NORMAL,
    now: Date = new Date(),
  ): Promise<{ allowed: boolean; reason?: string }> {
    const preference = await this.getPreferenceByChannel(userId, channel);

    if (!preference.isEnabled) {
      return { allowed: false, reason: `User has opted out of ${channel} notifications.` };
    }

    if (
      priority !== NotificationPriority.CRITICAL &&
      preference.quietHoursEnabled &&
      preference.isWithinQuietHours(now)
    ) {
      return { allowed: false, reason: `Delivery suppressed during quiet hours for ${channel}.` };
    }

    return { allowed: true };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private validateQuietHours(start?: string | null, end?: string | null): void {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;
    if (start && !timeRegex.test(start)) {
      throw new BadRequestException('quietHoursStart must be in valid HH:mm or HH:mm:ss format.');
    }
    if (end && !timeRegex.test(end)) {
      throw new BadRequestException('quietHoursEnd must be in valid HH:mm or HH:mm:ss format.');
    }
  }
}
