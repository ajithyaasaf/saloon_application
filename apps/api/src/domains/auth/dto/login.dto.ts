import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { DeviceInfoDto } from './device-info.dto';

/**
 * LoginDto — request body for `POST /v1/auth/login`.
 *
 * Used exclusively for B2B password-based authentication:
 * Salon Owners, Salon Staff, Super Admins, and Support Agents.
 * Customers authenticate via OTP only (FR-AUTH-001).
 *
 * Account lockout policy (Phase 7 §1.2, BR-007):
 *  - 5 consecutive invalid password attempts locks the account for 30 minutes.
 *  - Tracked in Redis: `ratelimit:login:failed:<email>`.
 */
export class LoginDto {
  @ApiProperty({
    description:
      'RFC 5321-compliant email address of the B2B account. ' +
      'Case-insensitive; normalized to lowercase before lookup.',
    example: 'owner@glamoursalon.in',
    format: 'email',
  })
  @IsEmail({}, { message: 'email must be a valid RFC-compliant email address' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description:
      'Account password. ' +
      'Must be 8–64 characters with at least one uppercase letter, ' +
      'one lowercase letter, one digit, and one special character.',
    example: 'SecureP@ss1',
    minLength: 8,
    maxLength: 64,
    format: 'password',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'password must be at least 8 characters' })
  @MaxLength(64, { message: 'password must be at most 64 characters' })
  @Matches(/[A-Z]/, { message: 'password must contain at least one uppercase letter' })
  @Matches(/[a-z]/, { message: 'password must contain at least one lowercase letter' })
  @Matches(/[0-9]/, { message: 'password must contain at least one numeric digit' })
  @Matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, {
    message: 'password must contain at least one special character',
  })
  password: string;

  @ApiProperty({
    description:
      'Device context persisted in the UserSession table for session management.',
    type: () => DeviceInfoDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceInfoDto)
  device?: DeviceInfoDto;
}
