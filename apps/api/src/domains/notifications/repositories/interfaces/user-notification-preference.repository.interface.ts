import { NotificationChannel, UserNotificationPreference } from '@prisma/client';
import {
  CreateNotificationPreferenceData,
  UpdateNotificationPreferenceData,
  UpsertNotificationPreferenceData,
} from '../../dto/notification-preference.dto';

export interface IUserNotificationPreferenceRepository {
  findById(id: string): Promise<UserNotificationPreference | null>;
  findByUser(userId: string): Promise<UserNotificationPreference[]>;
  findByUserAndChannel(
    userId: string,
    channel: NotificationChannel,
  ): Promise<UserNotificationPreference | null>;
  findEnabledByUser(userId: string): Promise<UserNotificationPreference[]>;
  create(data: CreateNotificationPreferenceData): Promise<UserNotificationPreference>;
  update(id: string, data: UpdateNotificationPreferenceData): Promise<UserNotificationPreference | null>;
  upsert(data: UpsertNotificationPreferenceData): Promise<UserNotificationPreference>;
  delete(id: string, userId?: string): Promise<UserNotificationPreference | null>;
  deleteByUser(userId: string): Promise<number>;
}
