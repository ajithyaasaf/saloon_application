import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

/**
 * RefreshTokenDto — request body for `POST /v1/auth/token/refresh`.
 *
 * The client submits the opaque refresh token UUID received during login.
 * Depending on the platform:
 *  - Web clients: refresh token is read automatically from the HttpOnly secure cookie.
 *  - Mobile clients (iOS/Android): refresh token is submitted in the request body.
 *
 * This DTO handles the explicit body-submission case (mobile).
 * Web clients using the HttpOnly cookie do not need to send this body field —
 * the controller reads the cookie transparently in that case.
 *
 * Token rotation & reuse detection (Phase 7 §1.3, BR-008):
 *  - Submitting a previously rotated or revoked token triggers immediate
 *    revocation of ALL active sessions for the user.
 */
export class RefreshTokenDto {
  @ApiProperty({
    description:
      'Opaque UUID refresh token received on login. ' +
      'Required for mobile clients. ' +
      'Web clients using the HttpOnly cookie do not need to supply this field — ' +
      'the token is read automatically from the secure cookie.',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    format: 'uuid',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID(4, { message: 'refreshToken must be a valid UUID v4' })
  refreshToken: string;
}
