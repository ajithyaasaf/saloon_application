import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

/**
 * SendOtpDto — request body for `POST /v1/auth/otp/request`.
 *
 * Validates an Indian mobile phone number. Triggers OTP generation
 * and SMS dispatch via BullMQ (Phase 7 §1.1).
 *
 * Rate limit policy (Phase 7 §1.1):
 *  - Max 3 OTP requests per phone per 15-minute window.
 *  - Max 3 failed OTP verification attempts before 15-minute phone lockout.
 */
export class SendOtpDto {
  @ApiProperty({
    description:
      'Indian mobile phone number. Accepts formats: 9876543210, +919876543210, or 09876543210. ' +
      'Normalized to 10-digit form internally before storage.',
    example: '9876543210',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(\+91|91|0)?[6-9]\d{9}$/, {
    message:
      'phone must be a valid Indian mobile number (e.g. 9876543210 or +919876543210)',
  })
  phone: string;
}
