import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
} from '@prisma/client';

export class NotificationDeliveryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  notificationId: string;

  @ApiProperty({ enum: NotificationChannel })
  channel: NotificationChannel;

  @ApiProperty({ enum: NotificationStatus })
  status: NotificationStatus;

  @ApiPropertyOptional()
  providerMessageId?: string | null;

  @ApiPropertyOptional()
  sentAt?: Date | null;

  @ApiPropertyOptional()
  deliveredAt?: Date | null;

  @ApiPropertyOptional()
  failedReason?: string | null;

  @ApiProperty()
  retryCount: number;

  @ApiPropertyOptional()
  nextRetryAt?: Date | null;

  @ApiProperty()
  createdAt: Date;
}

export class NotificationResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174001', nullable: true })
  salonId?: string | null;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174002' })
  userId: string;

  @ApiPropertyOptional({ nullable: true })
  templateId?: string | null;

  @ApiProperty({ enum: NotificationChannel })
  channel: NotificationChannel;

  @ApiProperty({ enum: NotificationPriority })
  priority: NotificationPriority;

  @ApiProperty({ enum: NotificationCategory })
  category: NotificationCategory;

  @ApiProperty({ example: 'Booking Confirmed' })
  title: string;

  @ApiProperty({ example: 'Your appointment is booked for 3:00 PM.' })
  body: string;

  @ApiPropertyOptional({ nullable: true })
  idempotencyKey?: string | null;

  @ApiPropertyOptional({ nullable: true })
  metadata?: Record<string, unknown> | null;

  @ApiPropertyOptional({ nullable: true })
  scheduledAt?: Date | null;

  @ApiPropertyOptional({ nullable: true })
  readAt?: Date | null;

  @ApiProperty({ example: false })
  isRead: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ type: [NotificationDeliveryResponseDto] })
  deliveries?: NotificationDeliveryResponseDto[];
}

export class NotificationInboxCountResponseDto {
  @ApiProperty({ example: 5, description: 'Number of unread notifications in inbox' })
  unreadCount: number;
}
