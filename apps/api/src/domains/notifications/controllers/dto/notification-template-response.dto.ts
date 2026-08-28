import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationCategory, NotificationChannel } from '@prisma/client';

export class NotificationTemplateResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174001', nullable: true })
  salonId?: string | null;

  @ApiProperty({ example: 'APPOINTMENT_REMINDER' })
  templateCode: string;

  @ApiProperty({ enum: NotificationChannel })
  channel: NotificationChannel;

  @ApiProperty({ enum: NotificationCategory })
  category: NotificationCategory;

  @ApiPropertyOptional({ example: 'Reminder SMS before appointment' })
  description?: string | null;

  @ApiPropertyOptional({ example: 'Your appointment is confirmed' })
  subjectTemplate?: string | null;

  @ApiProperty({ example: 'Hi {{customerName}}, your booking is at {{time}}.' })
  bodyTemplate: string;

  @ApiPropertyOptional()
  variables?: Record<string, unknown> | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
