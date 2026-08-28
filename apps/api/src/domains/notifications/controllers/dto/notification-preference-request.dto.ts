import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationChannel } from '@prisma/client';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class UpdatePreferenceRequestDto {
  @ApiProperty({ enum: NotificationChannel, description: 'Target notification channel' })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiPropertyOptional({ description: 'Enable or disable channel', default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable quiet hours for channel' })
  @IsOptional()
  @IsBoolean()
  quietHoursEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Quiet hours start time (HH:mm or HH:mm:ss)', example: '22:00:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, {
    message: 'quietHoursStart must be in valid HH:mm or HH:mm:ss format',
  })
  quietHoursStart?: string;

  @ApiPropertyOptional({ description: 'Quiet hours end time (HH:mm or HH:mm:ss)', example: '08:00:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, {
    message: 'quietHoursEnd must be in valid HH:mm or HH:mm:ss format',
  })
  quietHoursEnd?: string;
}

export class SetQuietHoursRequestDto {
  @ApiProperty({ enum: NotificationChannel })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiProperty({ description: 'Quiet hours start time', example: '22:00:00' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, {
    message: 'start must be in valid HH:mm or HH:mm:ss format',
  })
  start: string;

  @ApiProperty({ description: 'Quiet hours end time', example: '08:00:00' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, {
    message: 'end must be in valid HH:mm or HH:mm:ss format',
  })
  end: string;
}
