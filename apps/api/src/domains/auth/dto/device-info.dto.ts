import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  Matches,
  IsOptional,
  MaxLength,
} from 'class-validator';

/**
 * DeviceInfoDto — embedded device context captured on every auth action.
 *
 * Persisted in `user_sessions.device_id`, `user_agent`, `ip_address`.
 * Architecture ref: Phase 3 §2 entity #2 (UserSession), Phase 5 §5.1
 */
export class DeviceInfoDto {
  @ApiProperty({
    description:
      'Unique identifier for the physical device. ' +
      'Use a stable, non-rotating device fingerprint (e.g. iOS identifierForVendor or Android ANDROID_ID).',
    example: 'a3f9c1b0-4e72-4d85-93c1-7b2d6e0f9a12',
    maxLength: 128,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  deviceId: string;

  @ApiProperty({
    description: 'Human-readable device model name shown in active session list.',
    example: 'iPhone 15 Pro',
    maxLength: 128,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  deviceName?: string;

  @ApiProperty({
    description: 'Client platform identifier.',
    example: 'ios',
    enum: ['ios', 'android', 'web'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^(ios|android|web)$/, {
    message: 'platform must be one of: ios, android, web',
  })
  platform?: string;

  @ApiProperty({
    description: 'Application version string for telemetry purposes.',
    example: '1.4.2',
    required: false,
    maxLength: 32,
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Matches(/^\d+\.\d+(\.\d+)?(-[a-zA-Z0-9]+)?$/, {
    message: 'appVersion must be a valid semver string (e.g. 1.0.0)',
  })
  appVersion?: string;
}
