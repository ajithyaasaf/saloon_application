import {
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
} from '@prisma/client';
import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

// ─── Notification Events ──────────────────────────────────────────────────────

export interface NotificationCreatedPayload {
  notificationId: string;
  userId: string;
  salonId?: string | null;
  channel: NotificationChannel;
  priority: NotificationPriority;
  category: NotificationCategory;
  title: string;
  scheduledAt?: Date | null;
}

export class NotificationCreatedEvent extends BaseDomainEvent<NotificationCreatedPayload> {
  static readonly EVENT_NAME = 'notification.created.v1';
  constructor(payload: NotificationCreatedPayload, actorId?: string) {
    super(NotificationCreatedEvent.EVENT_NAME, payload.notificationId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface NotificationScheduledPayload {
  notificationId: string;
  userId: string;
  salonId?: string | null;
  scheduledAt: Date;
}

export class NotificationScheduledEvent extends BaseDomainEvent<NotificationScheduledPayload> {
  static readonly EVENT_NAME = 'notification.scheduled.v1';
  constructor(payload: NotificationScheduledPayload, actorId?: string) {
    super(NotificationScheduledEvent.EVENT_NAME, payload.notificationId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface NotificationDispatchedPayload {
  notificationId: string;
  userId: string;
  salonId?: string | null;
  channel: NotificationChannel;
  deliveryId: string;
  providerMessageId?: string | null;
}

export class NotificationDispatchedEvent extends BaseDomainEvent<NotificationDispatchedPayload> {
  static readonly EVENT_NAME = 'notification.dispatched.v1';
  constructor(payload: NotificationDispatchedPayload, actorId?: string) {
    super(NotificationDispatchedEvent.EVENT_NAME, payload.notificationId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface NotificationDeliveredPayload {
  notificationId: string;
  deliveryId: string;
  channel: NotificationChannel;
  deliveredAt: Date;
}

export class NotificationDeliveredEvent extends BaseDomainEvent<NotificationDeliveredPayload> {
  static readonly EVENT_NAME = 'notification.delivered.v1';
  constructor(payload: NotificationDeliveredPayload, actorId?: string) {
    super(NotificationDeliveredEvent.EVENT_NAME, payload.notificationId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface NotificationFailedPayload {
  notificationId: string;
  deliveryId: string;
  channel: NotificationChannel;
  reason: string;
  canRetry: boolean;
}

export class NotificationFailedEvent extends BaseDomainEvent<NotificationFailedPayload> {
  static readonly EVENT_NAME = 'notification.failed.v1';
  constructor(payload: NotificationFailedPayload, actorId?: string) {
    super(NotificationFailedEvent.EVENT_NAME, payload.notificationId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface NotificationReadPayload {
  notificationId: string;
  userId: string;
  readAt: Date;
}

export class NotificationReadEvent extends BaseDomainEvent<NotificationReadPayload> {
  static readonly EVENT_NAME = 'notification.read.v1';
  constructor(payload: NotificationReadPayload, actorId?: string) {
    super(NotificationReadEvent.EVENT_NAME, payload.notificationId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface NotificationDeletedPayload {
  notificationId: string;
  userId: string;
}

export class NotificationDeletedEvent extends BaseDomainEvent<NotificationDeletedPayload> {
  static readonly EVENT_NAME = 'notification.deleted.v1';
  constructor(payload: NotificationDeletedPayload, actorId?: string) {
    super(NotificationDeletedEvent.EVENT_NAME, payload.notificationId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface NotificationRetryScheduledPayload {
  notificationId: string;
  deliveryId: string;
  channel: NotificationChannel;
  retryCount: number;
  nextRetryAt: Date;
}

export class NotificationRetryScheduledEvent extends BaseDomainEvent<NotificationRetryScheduledPayload> {
  static readonly EVENT_NAME = 'notification.retry-scheduled.v1';
  constructor(payload: NotificationRetryScheduledPayload, actorId?: string) {
    super(NotificationRetryScheduledEvent.EVENT_NAME, payload.notificationId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

// ─── Template Events ──────────────────────────────────────────────────────────

export interface NotificationTemplateCreatedPayload {
  templateId: string;
  templateCode: string;
  salonId?: string | null;
  channel: NotificationChannel;
  category: NotificationCategory;
}

export class NotificationTemplateCreatedEvent extends BaseDomainEvent<NotificationTemplateCreatedPayload> {
  static readonly EVENT_NAME = 'notification.template.created.v1';
  constructor(payload: NotificationTemplateCreatedPayload, actorId?: string) {
    super(NotificationTemplateCreatedEvent.EVENT_NAME, payload.templateId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface NotificationTemplateUpdatedPayload {
  templateId: string;
  templateCode: string;
  salonId?: string | null;
  updatedFields: string[];
}

export class NotificationTemplateUpdatedEvent extends BaseDomainEvent<NotificationTemplateUpdatedPayload> {
  static readonly EVENT_NAME = 'notification.template.updated.v1';
  constructor(payload: NotificationTemplateUpdatedPayload, actorId?: string) {
    super(NotificationTemplateUpdatedEvent.EVENT_NAME, payload.templateId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface NotificationTemplateActivatedPayload {
  templateId: string;
  templateCode: string;
  salonId?: string | null;
}

export class NotificationTemplateActivatedEvent extends BaseDomainEvent<NotificationTemplateActivatedPayload> {
  static readonly EVENT_NAME = 'notification.template.activated.v1';
  constructor(payload: NotificationTemplateActivatedPayload, actorId?: string) {
    super(NotificationTemplateActivatedEvent.EVENT_NAME, payload.templateId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface NotificationTemplateDeactivatedPayload {
  templateId: string;
  templateCode: string;
  salonId?: string | null;
}

export class NotificationTemplateDeactivatedEvent extends BaseDomainEvent<NotificationTemplateDeactivatedPayload> {
  static readonly EVENT_NAME = 'notification.template.deactivated.v1';
  constructor(payload: NotificationTemplateDeactivatedPayload, actorId?: string) {
    super(NotificationTemplateDeactivatedEvent.EVENT_NAME, payload.templateId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

// ─── Preference Events ────────────────────────────────────────────────────────

export interface NotificationPreferenceUpdatedPayload {
  userId: string;
  channel: NotificationChannel;
  isEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
}

export class NotificationPreferenceUpdatedEvent extends BaseDomainEvent<NotificationPreferenceUpdatedPayload> {
  static readonly EVENT_NAME = 'notification.preference.updated.v1';
  constructor(payload: NotificationPreferenceUpdatedPayload, actorId?: string) {
    super(NotificationPreferenceUpdatedEvent.EVENT_NAME, payload.userId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}
