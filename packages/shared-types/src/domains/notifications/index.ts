import { NotificationCategory, NotificationChannel, NotificationPriority, NotificationStatus } from '../../enums/index.js';

export interface NotificationItemDto {
  id: string;
  userId: string;
  salonId?: string | null;
  title: string;
  body: string;
  channel: NotificationChannel;
  category: NotificationCategory;
  priority: NotificationPriority;
  status: NotificationStatus;
  data?: Record<string, any> | null;
  readAt?: string | null;
  createdAt: string;
}

export interface UserNotificationPreferenceDto {
  userId: string;
  channel: NotificationChannel;
  category: NotificationCategory;
  isEnabled: boolean;
  quietHoursStart?: string | null; // "22:00"
  quietHoursEnd?: string | null; // "08:00"
}

export interface UpdateNotificationPreferenceDto {
  channel: NotificationChannel;
  category: NotificationCategory;
  isEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface UnreadNotificationCountDto {
  unreadCount: number;
}

export type InboxCountDto = UnreadNotificationCountDto;
