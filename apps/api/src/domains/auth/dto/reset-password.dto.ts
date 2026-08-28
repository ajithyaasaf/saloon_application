import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * ResetPasswordDto — request body for `POST /v1/auth/password/reset`.
 *
 * Submits the one-time reset token from the email link alongside the
 * new password. The service validates the token against Redis and sets
 * the new `passwordHash` via bcrypt (salt 12).
 *
 * Post-reset security actions (Phase 7 §1.4):
 *  1. Reset token is deleted from Redis immediately after use.
 *  2. ALL active UserSession rows for the user are revoked.
 *  3. Audit log entry: `AuditAction.PASSWORD_RESET`.
 */
export class ResetPasswordDto {
  @ApiProperty({
    description:
      'One-time password reset token received in the email link. ' +
      'Valid for 15 minutes from dispatch time. ' +
      'Single-use — invalidated immediately upon successful use.',
    example: 'a3d9f2c1b04e724d8593c17b2d6e0f9a128c4e5f6d7b8a9102c3d4e5f6a7b8c9',
    minLength: 64,
    maxLength: 64,
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-f0-9]{64}$/, {
    message: 'token must be a 64-character lowercase hexadecimal string',
  })
  token: string;

  @ApiProperty({
    description:
      'New password to set for the account. ' +
      'Must be 8–64 characters and contain at least one uppercase letter, ' +
      'one lowercase letter, one numeric digit, and one special character.',
    example: 'NewS3cure!Pass',
    minLength: 8,
    maxLength: 64,
    format: 'password',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'newPassword must be at least 8 characters' })
  @MaxLength(64, { message: 'newPassword must be at most 64 characters' })
  @Matches(/[A-Z]/, { message: 'newPassword must contain at least one uppercase letter' })
  @Matches(/[a-z]/, { message: 'newPassword must contain at least one lowercase letter' })
  @Matches(/[0-9]/, { message: 'newPassword must contain at least one numeric digit' })
  @Matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, {
    message: 'newPassword must contain at least one special character',
  })
  newPassword: string;
}
