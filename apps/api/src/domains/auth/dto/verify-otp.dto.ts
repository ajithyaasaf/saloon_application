import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';

import { DeviceInfoDto } from './device-info.dto';

/**
 * VerifyOtpDto — request body for `POST /v1/auth/otp/verify`.
 *
 * Validates the 6-digit numeric OTP against the phone number.
 * On success, issues a JWT access token + opaque refresh token pair
 * and persists a UserSession row.
 *
 * Security policy (Phase 7 §1.1, BR-006):
 *  - Max 3 failed verification attempts before the OTP is invalidated
 *    and the phone number is locked out for 15 minutes.
 */
export class VerifyOtpDto {
  @ApiProperty({
    description:
      'The phone number the OTP was sent to. ' +
      'Must exactly match the phone used in the preceding `POST /v1/auth/otp/request` call.',
    example: '9876543210',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(\+91|91|0)?[6-9]\d{9}$/, {
    message:
      'phone must be a valid Indian mobile number (e.g. 9876543210 or +919876543210)',
  })
  phone: string;

  @ApiProperty({
    description:
      'Exactly 6 numeric digits received via SMS. ' +
      'OTP is valid for 5 minutes after dispatch.',
    example: '482951',
    minLength: 6,
    maxLength: 6,
    pattern: '^[0-9]{6}$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{6}$/, {
    message: 'otp must be exactly 6 numeric digits',
  })
  otp: string;

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
