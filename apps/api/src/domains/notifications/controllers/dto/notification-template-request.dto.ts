import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationCategory, NotificationChannel } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateNotificationTemplateRequestDto {
  @ApiProperty({ description: 'Unique uppercase template code', example: 'APPOINTMENT_REMINDER' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'templateCode must contain only uppercase alphanumeric characters and underscores',
  })
  templateCode: string;

  @ApiProperty({ enum: NotificationChannel, description: 'Target delivery channel' })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiProperty({ enum: NotificationCategory, description: 'Notification category' })
  @IsEnum(NotificationCategory)
  category: NotificationCategory;

  @ApiPropertyOptional({ description: 'Short description of template usage' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Subject template for email/push', example: 'Appointment at {{salonName}}' })
  @IsOptional()
  @IsString()
  subjectTemplate?: string;

  @ApiProperty({ description: 'Body template with {{variable}} placeholders', example: 'Hello {{customerName}}, your appointment is at {{time}}.' })
  @IsString()
  @IsNotEmpty()
  bodyTemplate: string;

  @ApiPropertyOptional({ description: 'JSON schema or dictionary of variables' })
  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Whether template is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateNotificationTemplateRequestDto {
  @ApiPropertyOptional({ description: 'Unique uppercase template code' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9_]+$/)
  templateCode?: string;

  @ApiPropertyOptional({ enum: NotificationChannel })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @ApiPropertyOptional({ enum: NotificationCategory })
  @IsOptional()
  @IsEnum(NotificationCategory)
  category?: NotificationCategory;

  @ApiPropertyOptional({ description: 'Short description of template usage' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Subject template for email/push' })
  @IsOptional()
  @IsString()
  subjectTemplate?: string;

  @ApiPropertyOptional({ description: 'Body template with {{variable}} placeholders' })
  @IsOptional()
  @IsString()
  bodyTemplate?: string;

  @ApiPropertyOptional({ description: 'JSON dictionary of variables' })
  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Whether template is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SearchNotificationTemplateRequestDto {
  @ApiPropertyOptional({ description: 'Filter by template code search' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: NotificationChannel })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @ApiPropertyOptional({ enum: NotificationCategory })
  @IsOptional()
  @IsEnum(NotificationCategory)
  category?: NotificationCategory;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

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

export class RenderNotificationTemplateRequestDto {
  @ApiProperty({ description: 'Variable key-value pairs to interpolate into template' })
  @IsObject()
  variables: Record<string, unknown>;
}

export class PreviewNotificationTemplateRequestDto {
  @ApiPropertyOptional({ description: 'Sample variables to preview render' })
  @IsOptional()
  @IsObject()
  sampleVariables?: Record<string, unknown>;
}
