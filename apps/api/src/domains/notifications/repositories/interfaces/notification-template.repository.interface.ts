import { NotificationChannel, NotificationTemplate, Prisma } from '@prisma/client';
import {
  CreateNotificationTemplateData,
  SearchNotificationTemplateQueryDto,
  UpdateNotificationTemplateData,
} from '../../dto/notification-template.dto';

export interface INotificationTemplateRepository {
  findById(id: string, salonId?: string | null): Promise<NotificationTemplate | null>;
  findByCode(code: string, salonId?: string | null): Promise<NotificationTemplate | null>;
  findByCodeAndChannel(
    code: string,
    channel: NotificationChannel,
    salonId?: string | null,
  ): Promise<NotificationTemplate | null>;
  findByChannel(channel: NotificationChannel, salonId?: string | null): Promise<NotificationTemplate[]>;
  findBySalon(
    salonId: string | null,
    options?: { page?: number; limit?: number },
  ): Promise<{ data: NotificationTemplate[]; total: number }>;
  findActiveByCode(code: string, salonId?: string | null): Promise<NotificationTemplate | null>;
  search(query: SearchNotificationTemplateQueryDto): Promise<{ data: NotificationTemplate[]; total: number }>;
  count(where?: Prisma.NotificationTemplateWhereInput): Promise<number>;
  create(data: CreateNotificationTemplateData): Promise<NotificationTemplate>;
  update(
    id: string,
    data: UpdateNotificationTemplateData,
    salonId?: string | null,
  ): Promise<NotificationTemplate | null>;
  activate(id: string, salonId?: string | null): Promise<NotificationTemplate | null>;
  deactivate(id: string, salonId?: string | null): Promise<NotificationTemplate | null>;
  softDelete(id: string, salonId?: string | null): Promise<NotificationTemplate | null>;
  checkCodeExists(code: string, salonId?: string | null, excludeId?: string): Promise<boolean>;
}
