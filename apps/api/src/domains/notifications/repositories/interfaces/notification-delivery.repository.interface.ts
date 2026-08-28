import { NotificationDelivery, NotificationStatus } from '@prisma/client';
import {
  CreateNotificationDeliveryData,
  SearchNotificationDeliveryQueryDto,
  UpdateNotificationDeliveryData,
} from '../../dto/notification-delivery.dto';

export interface INotificationDeliveryRepository {
  findById(id: string): Promise<NotificationDelivery | null>;
  findByNotification(notificationId: string): Promise<NotificationDelivery[]>;
  findByProviderMessageId(providerMessageId: string): Promise<NotificationDelivery | null>;
  findPendingRetries(limit?: number, beforeDate?: Date): Promise<NotificationDelivery[]>;
  findByStatus(status: NotificationStatus, limit?: number): Promise<NotificationDelivery[]>;
  create(data: CreateNotificationDeliveryData): Promise<NotificationDelivery>;
  update(id: string, data: UpdateNotificationDeliveryData): Promise<NotificationDelivery | null>;
  updateStatus(
    id: string,
    status: NotificationStatus,
    failedReason?: string,
  ): Promise<NotificationDelivery | null>;
  updateProviderMessageId(id: string, providerMessageId: string): Promise<NotificationDelivery | null>;
  updateDeliveryMetadata(
    id: string,
    externalMetadata: Record<string, unknown>,
  ): Promise<NotificationDelivery | null>;
  scheduleRetry(id: string, nextRetryAt: Date, incrementCount?: boolean): Promise<NotificationDelivery | null>;
  incrementRetryCount(id: string): Promise<NotificationDelivery | null>;
  markSent(id: string, providerMessageId?: string): Promise<NotificationDelivery | null>;
  markDelivered(id: string, deliveredAt?: Date): Promise<NotificationDelivery | null>;
  markFailed(id: string, reason: string): Promise<NotificationDelivery | null>;
  search(
    query: SearchNotificationDeliveryQueryDto,
  ): Promise<{ data: NotificationDelivery[]; total: number }>;
}
