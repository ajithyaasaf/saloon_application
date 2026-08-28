import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

/**
 * VerifyEmailDto — request body for `POST /v1/users/me/email/verify`.
 *
 * Completes the email-change flow by submitting the 6-character hex token
 * that was dispatched to the user's new email address.
 *
 * Architecture ref: Phase 8.0 §6
 */
export class VerifyEmailDto {
  @ApiProperty({
    description:
      'The 6-character hex verification token sent to the new email address. ' +
      'Expires after 30 minutes. Single-use.',
    example: 'a1b2c3',
    minLength: 6,
    maxLength: 6,
  })
  @IsNotEmpty({ message: 'token is required' })
  @IsString()
  @Length(6, 6, { message: 'token must be exactly 6 characters' })
  token: string;
}
