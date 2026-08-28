import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
} from '@prisma/client';
import { AuditService } from '../../../shared/audit/audit.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { NotificationService as TransportNotificationService } from '../../../shared/notification/notification.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { NotificationDeliveryEntity } from '../entities/notification-delivery.entity';
import { NotificationEntity } from '../entities/notification.entity';
import {
  NotificationCreatedEvent,
  NotificationDeliveredEvent,
  NotificationDispatchedEvent,
  NotificationFailedEvent,
  NotificationRetryScheduledEvent,
  NotificationScheduledEvent,
} from '../events/notification.events';
import { NotificationDeliveryRepository } from '../repositories/notification-delivery.repository';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationPreferenceService } from './notification-preference.service';
import { NotificationTemplateService } from './notification-template.service';

export interface DispatchNotificationOptions {
  userId: string;
  salonId?: string | null;
  templateCode?: string;
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
  category?: NotificationCategory;
  title?: string;
  body?: string;
  templateVariables?: Record<string, unknown>;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown>;
  scheduledAt?: Date | null;
  recipientAddress?: string; // Optional phone/email/deviceToken override if not inferable
}

@Injectable()
export class NotificationDispatchService {
  private readonly logger = new Logger(NotificationDispatchService.name);

  constructor(
    private readonly notificationRepo: NotificationRepository,
    private readonly deliveryRepo: NotificationDeliveryRepository,
    private readonly templateService: NotificationTemplateService,
    private readonly preferenceService: NotificationPreferenceService,
    private readonly transportService: TransportNotificationService,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly eventBus: EventBusService,
  ) {}

  public async dispatch(
    options: DispatchNotificationOptions,
    actorId?: string,
  ): Promise<NotificationEntity> {
    const priority = options.priority ?? NotificationPriority.NORMAL;
    const category = options.category ?? NotificationCategory.SYSTEM;

    // ── 1. Idempotency Check ──────────────────────────────────────────────────
    if (options.idempotencyKey) {
      const existing = await this.notificationRepo.findByIdempotencyKey(
        options.idempotencyKey,
      );
      if (existing) {
        this.logger.debug(
          `Idempotent duplicate avoided for key: ${options.idempotencyKey}`,
        );
        return new NotificationEntity(existing);
      }
    }

    // ── 2. Content & Template Resolution ─────────────────────────────────────
    let finalTitle = options.title ?? '';
    let finalBody = options.body ?? '';
    let resolvedTemplateId: string | null = null;

    const targetChannels =
      options.channels && options.channels.length > 0
        ? options.channels
        : [NotificationChannel.IN_APP, NotificationChannel.PUSH];

    if (options.templateCode) {
      // Resolve against primary channel or fallback
      const primaryChannel = targetChannels[0] ?? NotificationChannel.PUSH;
      const template = await this.templateService.resolveTemplate(
        options.templateCode,
        primaryChannel,
        options.salonId,
      );
      resolvedTemplateId = template.id;

      const rendered = template.render(options.templateVariables ?? {});
      finalTitle = rendered.subject ?? options.title ?? template.templateCode;
      finalBody = rendered.body;
    }

    if (!finalBody || finalBody.trim().length === 0) {
      throw new BadRequestException('Notification body cannot be empty.');
    }

    // ── 3. Preference & Quiet Hours Evaluation ───────────────────────────────
    const eligibleChannels: NotificationChannel[] = [];
    for (const ch of targetChannels) {
      const eligibility = await this.preferenceService.canDeliver(
        options.userId,
        ch,
        priority,
        new Date(),
      );
      if (eligibility.allowed) {
        eligibleChannels.push(ch);
      } else {
        this.logger.debug(
          `Suppressed ${ch} for user ${options.userId}: ${eligibility.reason}`,
        );
      }
    }

    if (eligibleChannels.length === 0) {
      this.logger.warn(
        `All requested channels suppressed for user ${options.userId}. Creating IN_APP delivery fallback.`,
      );
      eligibleChannels.push(NotificationChannel.IN_APP);
    }

    // ── 4. Atomic Database Persistence ────────────────────────────────────────
    const isScheduled =
      !!options.scheduledAt && options.scheduledAt.getTime() > Date.now();

    const createdRecord = await this.transactionService.run(async () => {
      const notif = await this.notificationRepo.create({
        salonId: options.salonId ?? null,
        userId: options.userId,
        templateId: resolvedTemplateId,
        channel: eligibleChannels[0],
        priority,
        category,
        title: finalTitle || 'Notification',
        body: finalBody,
        idempotencyKey: options.idempotencyKey ?? null,
        metadata: options.metadata ?? null,
        scheduledAt: options.scheduledAt ?? null,
      });

      // Create a delivery attempt record for each eligible channel
      const deliveries = await Promise.all(
        eligibleChannels.map((channel) =>
          this.deliveryRepo.create({
            notificationId: notif.id,
            channel,
            status: isScheduled
              ? NotificationStatus.QUEUED
              : channel === NotificationChannel.IN_APP
              ? NotificationStatus.DELIVERED
              : NotificationStatus.QUEUED,
            sentAt:
              channel === NotificationChannel.IN_APP && !isScheduled
                ? new Date()
                : null,
            deliveredAt:
              channel === NotificationChannel.IN_APP && !isScheduled
                ? new Date()
                : null,
          }),
        ),
      );

      return { notif, deliveries };
    });

    const entity = new NotificationEntity({
      ...createdRecord.notif,
      deliveries: createdRecord.deliveries,
    });

    // ── 5. Audit & Initial Lifecycle Events ──────────────────────────────────
    await this.auditService.log({
      action: 'CREATE',
      entityType: 'Notification',
      entityId: entity.id,
      actorId,
      newState: {
        userId: entity.userId,
        salonId: entity.salonId,
        channels: eligibleChannels,
        priority: entity.priority,
        category: entity.category,
        scheduledAt: entity.scheduledAt,
      },
    });

    if (isScheduled) {
      await this.eventBus.publish(
        new NotificationScheduledEvent(
          {
            notificationId: entity.id,
            userId: entity.userId,
            salonId: entity.salonId,
            scheduledAt: options.scheduledAt!,
          },
          actorId,
        ),
      );
    } else {
      await this.eventBus.publish(
        new NotificationCreatedEvent(
          {
            notificationId: entity.id,
            userId: entity.userId,
            salonId: entity.salonId,
            channel: entity.channel,
            priority: entity.priority,
            category: entity.category,
            title: entity.title,
            scheduledAt: entity.scheduledAt,
          },
          actorId,
        ),
      );
    }

    // ── 6. External Queue Transport Dispatch ─────────────────────────────────
    if (!isScheduled) {
      for (const delivery of createdRecord.deliveries) {
        if (delivery.channel === NotificationChannel.IN_APP) {
          // Already delivered to user's database inbox
          continue;
        }

        try {
          const transportResult = await this.transportService.send({
            recipient: options.recipientAddress ?? options.userId,
            channel: delivery.channel,
            templateId: options.templateCode ?? 'custom_message',
            subject: finalTitle,
            body: finalBody,
            idempotencyKey: `${options.idempotencyKey ?? entity.id}:${delivery.channel}`,
            metadata: options.metadata,
          });

          await this.deliveryRepo.markSent(delivery.id, transportResult.jobId);

          await this.eventBus.publish(
            new NotificationDispatchedEvent(
              {
                notificationId: entity.id,
                userId: entity.userId,
                salonId: entity.salonId,
                channel: delivery.channel,
                deliveryId: delivery.id,
                providerMessageId: transportResult.jobId,
              },
              actorId,
            ),
          );
        } catch (error: any) {
          this.logger.error(
            `Transport dispatch failed for channel ${delivery.channel}: ${error.message}`,
            error.stack,
          );

          const deliveryEntity = new NotificationDeliveryEntity(delivery);
          const canRetry = deliveryEntity.canRetry();

          await this.deliveryRepo.markFailed(delivery.id, error.message);

          if (canRetry) {
            const nextDelay = deliveryEntity.calculateNextRetryDelayMs();
            const nextRetryAt = new Date(Date.now() + nextDelay);
            await this.deliveryRepo.scheduleRetry(delivery.id, nextRetryAt);

            await this.eventBus.publish(
              new NotificationRetryScheduledEvent({
                notificationId: entity.id,
                deliveryId: delivery.id,
                channel: delivery.channel,
                retryCount: delivery.retryCount + 1,
                nextRetryAt,
              }),
            );
          }

          await this.eventBus.publish(
            new NotificationFailedEvent({
              notificationId: entity.id,
              deliveryId: delivery.id,
              channel: delivery.channel,
              reason: error.message,
              canRetry,
            }),
          );
        }
      }
    }

    return entity;
  }

  public async processRetries(limit = 50): Promise<number> {
    const pending = await this.deliveryRepo.findPendingRetries(limit, new Date());
    let retriedCount = 0;

    for (const delivery of pending) {
      const deliveryEntity = new NotificationDeliveryEntity(delivery);
      if (!deliveryEntity.canRetry()) {
        continue;
      }

      const notif = await this.notificationRepo.findById(delivery.notificationId);
      if (!notif) continue;

      try {
        const transportResult = await this.transportService.send({
          recipient: notif.userId,
          channel: delivery.channel,
          templateId: notif.templateId ?? 'retry_notification',
          subject: notif.title,
          body: notif.body,
          idempotencyKey: `retry:${delivery.id}:${delivery.retryCount + 1}`,
          metadata: (notif.metadata as Record<string, unknown>) ?? undefined,
        });

        await this.deliveryRepo.markSent(delivery.id, transportResult.jobId);
        retriedCount++;

        await this.eventBus.publish(
          new NotificationDispatchedEvent({
            notificationId: notif.id,
            userId: notif.userId,
            salonId: notif.salonId,
            channel: delivery.channel,
            deliveryId: delivery.id,
            providerMessageId: transportResult.jobId,
          }),
        );
      } catch (error: any) {
        this.logger.error(
          `Retry attempt failed for delivery ${delivery.id}: ${error.message}`,
        );

        if (deliveryEntity.retryCount + 1 < NotificationDeliveryEntity.MAX_RETRIES) {
          const nextDelay = deliveryEntity.calculateNextRetryDelayMs();
          const nextRetryAt = new Date(Date.now() + nextDelay);
          await this.deliveryRepo.scheduleRetry(delivery.id, nextRetryAt, true);
        } else {
          await this.deliveryRepo.markFailed(
            delivery.id,
            `Permanent failure after maximum retries: ${error.message}`,
          );
        }
      }
    }

    return retriedCount;
  }
}
