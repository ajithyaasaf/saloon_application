import { NotificationChannel, NotificationCategory } from '@prisma/client';

export interface CreateNotificationTemplateData {
  salonId?: string | null;
  templateCode: string;
  channel: NotificationChannel;
  category?: NotificationCategory;
  description?: string | null;
  subjectTemplate?: string | null;
  bodyTemplate: string;
  variables?: Record<string, unknown> | null;
  isActive?: boolean;
}

export interface UpdateNotificationTemplateData {
  templateCode?: string;
  channel?: NotificationChannel;
  category?: NotificationCategory;
  description?: string | null;
  subjectTemplate?: string | null;
  bodyTemplate?: string;
  variables?: Record<string, unknown> | null;
  isActive?: boolean;
}

export interface SearchNotificationTemplateQueryDto {
  salonId?: string | null;
  channel?: NotificationChannel;
  category?: NotificationCategory;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}
