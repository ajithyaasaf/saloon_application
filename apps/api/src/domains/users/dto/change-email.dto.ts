import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty } from 'class-validator';

/**
 * ChangeEmailDto — request body for `POST /v1/users/me/email/request`.
 *
 * Initiates email change by dispatching a verification token to the new email.
 * Response is always generic to prevent email enumeration.
 *
 * Architecture ref: Phase 8.0 §6, §9.3
 */
export class ChangeEmailDto {
  @ApiProperty({
    description:
      'The new email address to associate with this account. ' +
      'A verification token will be sent to this address. ' +
      'Must not already be in use by another active account.',
    example: 'priya.new@example.com',
    format: 'email',
  })
  @IsNotEmpty({ message: 'newEmail is required' })
  @IsEmail({}, { message: 'newEmail must be a valid email address' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  newEmail: string;
}
