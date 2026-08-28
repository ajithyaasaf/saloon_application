import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

/**
 * ForgotPasswordDto — request body for `POST /v1/auth/password/forgot`.
 *
 * Accepts the registered email address of a B2B account and dispatches
 * a password reset link via email (BullMQ email queue).
 *
 * Security policy (Phase 7 §1.4):
 *  - The endpoint ALWAYS returns HTTP 200 regardless of whether the email
 *    exists, preventing account enumeration attacks.
 *  - Reset token: 64-char cryptographically secure hex string stored as a
 *    hash in Redis (`password:reset:<tokenHash> -> userId`, TTL: 15 minutes).
 *
 * Applicable roles: SALON_OWNER, SALON_STAFF, SUPER_ADMIN, SUPPORT_AGENT.
 * Customers authenticate via OTP and do not have passwords (FR-AUTH-001).
 */
export class ForgotPasswordDto {
  @ApiProperty({
    description:
      'Registered email address of the B2B account. ' +
      'A password reset link will be dispatched to this address if an account is found. ' +
      'The response is identical whether the email exists or not.',
    example: 'owner@glamoursalon.in',
    format: 'email',
  })
  @IsEmail({}, { message: 'email must be a valid RFC-compliant email address' })
  @IsNotEmpty()
  email: string;
}
