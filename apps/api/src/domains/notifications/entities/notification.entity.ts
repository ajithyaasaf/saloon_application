import {
  Notification,
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
} from '@prisma/client';
import { NotificationDeliveryEntity } from './notification-delivery.entity';
import { NotificationTemplateEntity } from './notification-template.entity';

export class NotificationEntity {
  id: string;
  salonId?: string | null;
  userId: string;
  templateId?: string | null;
  channel: NotificationChannel;
  priority: NotificationPriority;
  category: NotificationCategory;
  title: string;
  body: string;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown> | null;
  scheduledAt?: Date | null;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  template?: NotificationTemplateEntity | null;
  deliveries?: NotificationDeliveryEntity[];

  constructor(partial: Partial<Notification> | any) {
    Object.assign(this, partial);
    if (partial?.template) {
      this.template = new NotificationTemplateEntity(partial.template);
    }
    if (Array.isArray(partial?.deliveries)) {
      this.deliveries = partial.deliveries.map((d: any) => new NotificationDeliveryEntity(d));
    }
  }

  public isRead(): boolean {
    return !!this.readAt;
  }

  public isDeleted(): boolean {
    return !!this.deletedAt;
  }

  public isScheduled(now = new Date()): boolean {
    return !!this.scheduledAt && this.scheduledAt > now;
  }

  public markRead(date = new Date()): void {
    this.readAt = date;
  }

  public markUnread(): void {
    this.readAt = null;
  }

  public softDelete(date = new Date()): void {
    this.deletedAt = date;
  }
}
