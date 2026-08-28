import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * ChangePasswordDto — request body for `POST /v1/auth/password/change`.
 *
 * Authenticated endpoint (requires valid Bearer JWT). Allows a logged-in
 * B2B user to change their password by confirming their current password first.
 *
 * Security policy (Phase 7 §1.4):
 *  - `oldPassword` is verified via constant-time `bcrypt.compare`.
 *  - On success, ALL active UserSession rows for the user are revoked
 *    to force re-authentication on all other active devices.
 *  - Audit log entry: `AuditAction.PASSWORD_RESET`.
 *
 * Applicable roles: SALON_OWNER, SALON_STAFF, SUPER_ADMIN, SUPPORT_AGENT.
 */
export class ChangePasswordDto {
  @ApiProperty({
    description:
      'The user\'s current password for verification. ' +
      'Compared against the stored bcrypt hash using constant-time comparison.',
    example: 'CurrentP@ss1',
    format: 'password',
  })
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @ApiProperty({
    description:
      'New password to replace the current one. ' +
      'Must be 8–64 characters and contain at least one uppercase letter, ' +
      'one lowercase letter, one numeric digit, and one special character. ' +
      'Must differ from the current password (enforced at service layer).',
    example: 'UpdatedS3cure!Pass',
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
