import {
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
} from '@prisma/client';

export interface CreateNotificationData {
  salonId?: string | null;
  userId: string;
  templateId?: string | null;
  channel?: NotificationChannel;
  priority?: NotificationPriority;
  category?: NotificationCategory;
  title: string;
  body: string;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown> | null;
  scheduledAt?: Date | null;
  readAt?: Date | null;
}

export interface UpdateNotificationData {
  title?: string;
  body?: string;
  metadata?: Record<string, unknown> | null;
  readAt?: Date | null;
}

export interface SearchNotificationQueryDto {
  userId?: string;
  salonId?: string;
  channel?: NotificationChannel;
  priority?: NotificationPriority;
  category?: NotificationCategory;
  isRead?: boolean;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}
