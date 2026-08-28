import { Notification, NotificationStatus, Prisma } from '@prisma/client';
import { CreateNotificationData, SearchNotificationQueryDto, UpdateNotificationData } from '../../dto/notification.dto';

export interface INotificationRepository {
  findById(id: string): Promise<Notification | null>;
  findByUser(
    userId: string,
    options?: { page?: number; limit?: number; isRead?: boolean },
  ): Promise<{ data: Notification[]; total: number }>;
  findBySalon(
    salonId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{ data: Notification[]; total: number }>;
  findByUserAndId(userId: string, id: string): Promise<Notification | null>;
  findByIdempotencyKey(key: string): Promise<Notification | null>;
  create(data: CreateNotificationData): Promise<Notification>;
  update(id: string, data: UpdateNotificationData): Promise<Notification | null>;
  updateStatus(id: string, status: NotificationStatus): Promise<Notification | null>;
  markRead(id: string, userId?: string): Promise<Notification | null>;
  markUnread(id: string, userId?: string): Promise<Notification | null>;
  markAllRead(userId: string): Promise<number>;
  softDelete(id: string, userId?: string): Promise<Notification | null>;
  countUnread(userId: string): Promise<number>;
  search(query: SearchNotificationQueryDto): Promise<{ data: Notification[]; total: number }>;
  count(where?: Prisma.NotificationWhereInput): Promise<number>;
}
