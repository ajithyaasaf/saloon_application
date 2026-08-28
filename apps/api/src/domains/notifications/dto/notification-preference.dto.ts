import { NotificationChannel } from '@prisma/client';

export interface CreateNotificationPreferenceData {
  userId: string;
  channel: NotificationChannel;
  isEnabled?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
}

export interface UpdateNotificationPreferenceData {
  isEnabled?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
}

export interface UpsertNotificationPreferenceData {
  userId: string;
  channel: NotificationChannel;
  isEnabled?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
}
