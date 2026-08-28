import { NotificationChannel, NotificationStatus } from '@prisma/client';

export interface CreateNotificationDeliveryData {
  notificationId: string;
  channel: NotificationChannel;
  status?: NotificationStatus;
  providerMessageId?: string | null;
  sentAt?: Date | null;
  deliveredAt?: Date | null;
  readAt?: Date | null;
  failedReason?: string | null;
  externalMetadata?: Record<string, unknown> | null;
  retryCount?: number;
  nextRetryAt?: Date | null;
}

export interface UpdateNotificationDeliveryData {
  status?: NotificationStatus;
  providerMessageId?: string | null;
  sentAt?: Date | null;
  deliveredAt?: Date | null;
  readAt?: Date | null;
  failedReason?: string | null;
  externalMetadata?: Record<string, unknown> | null;
  retryCount?: number;
  nextRetryAt?: Date | null;
}

export interface SearchNotificationDeliveryQueryDto {
  notificationId?: string;
  channel?: NotificationChannel;
  status?: NotificationStatus;
  page?: number;
  limit?: number;
}
