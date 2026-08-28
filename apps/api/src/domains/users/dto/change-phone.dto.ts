import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

/**
 * ChangePhoneDto — request body for `POST /v1/users/me/phone/request`.
 *
 * Initiates phone number change by dispatching a 6-digit OTP to the new number.
 * Accepts Indian mobile numbers (10 digits) with optional +91 prefix.
 * Response is always generic to prevent phone enumeration.
 *
 * Architecture ref: Phase 8.0 §6, §7, §9.3
 */
export class ChangePhoneDto {
  @ApiProperty({
    description:
      'New Indian mobile number to associate with this account. ' +
      'Accepts 10-digit format or with +91 prefix. ' +
      'An OTP will be dispatched via SMS to this number.',
    example: '9876543210',
    pattern: '^(\\+91)?[6-9]\\d{9}$',
  })
  @IsNotEmpty({ message: 'newPhone is required' })
  @IsString()
  @Matches(/^(\+91)?[6-9]\d{9}$/, {
    message:
      'newPhone must be a valid 10-digit Indian mobile number, optionally prefixed with +91',
  })
  newPhone: string;
}
