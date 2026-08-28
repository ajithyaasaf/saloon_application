import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationChannel } from '@prisma/client';

export class UserNotificationPreferenceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: NotificationChannel })
  channel: NotificationChannel;

  @ApiProperty({ example: true })
  isEnabled: boolean;

  @ApiProperty({ example: false })
  quietHoursEnabled: boolean;

  @ApiPropertyOptional({ example: '22:00:00', nullable: true })
  quietHoursStart?: string | null;

  @ApiPropertyOptional({ example: '08:00:00', nullable: true })
  quietHoursEnd?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
