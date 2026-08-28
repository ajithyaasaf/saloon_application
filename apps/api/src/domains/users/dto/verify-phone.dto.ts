import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

/**
 * VerifyPhoneDto — request body for `POST /v1/users/me/phone/verify`.
 *
 * Completes the phone-change flow by submitting the 6-digit OTP
 * dispatched to the new phone number.
 *
 * Architecture ref: Phase 8.0 §6
 */
export class VerifyPhoneDto {
  @ApiProperty({
    description:
      'The 6-digit numeric OTP sent to the new phone number. ' +
      'Expires after 5 minutes. Max 3 verification attempts.',
    example: '483921',
    minLength: 6,
    maxLength: 6,
    pattern: '^[0-9]{6}$',
  })
  @IsNotEmpty({ message: 'otp is required' })
  @IsString()
  @Matches(/^[0-9]{6}$/, { message: 'otp must be exactly 6 numeric digits' })
  otp: string;
}
