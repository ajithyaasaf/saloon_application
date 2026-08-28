import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class SendNotificationRequestDto {
  @ApiProperty({ description: 'Target user ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ description: 'Template code to use for rendering', example: 'APPOINTMENT_CONFIRMED' })
  @IsOptional()
  @IsString()
  templateCode?: string;

  @ApiPropertyOptional({ enum: NotificationChannel, isArray: true, description: 'Target delivery channels' })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];

  @ApiPropertyOptional({ enum: NotificationPriority, default: NotificationPriority.NORMAL })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiPropertyOptional({ enum: NotificationCategory, default: NotificationCategory.SYSTEM })
  @IsOptional()
  @IsEnum(NotificationCategory)
  category?: NotificationCategory;

  @ApiPropertyOptional({ description: 'Notification title/subject if not using template', example: 'Special Offer' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Notification body text if not using template', example: 'Enjoy 20% off today!' })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional({ description: 'Key-value variables to interpolate into template' })
  @IsOptional()
  @IsObject()
  templateVariables?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Client-provided unique key for deduplication', example: 'booking-confirm-123' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiPropertyOptional({ description: 'Arbitrary structured metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'ISO 8601 future date for scheduled dispatch' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ description: 'Optional explicit recipient address (phone, email, etc.)' })
  @IsOptional()
  @IsString()
  recipientAddress?: string;
}

export class BroadcastNotificationRequestDto {
  @ApiProperty({ description: 'Array of target user IDs', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  userIds: string[];

  @ApiPropertyOptional({ description: 'Template code to use for rendering' })
  @IsOptional()
  @IsString()
  templateCode?: string;

  @ApiPropertyOptional({ enum: NotificationChannel, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];

  @ApiPropertyOptional({ enum: NotificationPriority, default: NotificationPriority.NORMAL })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiPropertyOptional({ enum: NotificationCategory, default: NotificationCategory.MARKETING })
  @IsOptional()
  @IsEnum(NotificationCategory)
  category?: NotificationCategory;

  @ApiPropertyOptional({ description: 'Notification title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Notification body text' })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional({ description: 'Key-value template variables' })
  @IsOptional()
  @IsObject()
  templateVariables?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Client-provided batch idempotency key prefix' })
  @IsOptional()
  @IsString()
  idempotencyKeyPrefix?: string;

  @ApiPropertyOptional({ description: 'Arbitrary metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class SearchNotificationRequestDto {
  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ enum: NotificationCategory })
  @IsOptional()
  @IsEnum(NotificationCategory)
  category?: NotificationCategory;

  @ApiPropertyOptional({ enum: NotificationChannel })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @ApiPropertyOptional({ description: 'Filter by read status' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isRead?: boolean;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
