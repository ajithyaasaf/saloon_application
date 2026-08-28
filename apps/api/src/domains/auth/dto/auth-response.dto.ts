import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { UserRole } from '@prisma/client';

// ─── Nested Response DTOs ──────────────────────────────────────────────────────

/**
 * AuthUserDto — safe public representation of the authenticated user.
 *
 * Excluded fields (never returned to client):
 *  - passwordHash, refreshTokenHash — security credentials
 *  - deletedAt, createdById, updatedById — internal audit fields
 *  - version — internal token invalidation counter
 */
@Exclude()
export class AuthUserDto {
  @Expose()
  @ApiProperty({
    description: 'User UUID.',
    example: 'a3d9f2c1-b04e-724d-8593-c17b2d6e0f9a',
    format: 'uuid',
  })
  id: string;

  @Expose()
  @ApiProperty({
    description: 'User first name.',
    example: 'Priya',
  })
  firstName: string;

  @Expose()
  @ApiProperty({
    description: 'User last name.',
    example: 'Sharma',
    required: false,
    nullable: true,
  })
  lastName: string | null;

  @Expose()
  @ApiProperty({
    description: 'Phone number of the user.',
    example: '9876543210',
  })
  phone: string;

  @Expose()
  @ApiProperty({
    description: 'Whether phone number has been verified.',
    example: true,
  })
  phoneVerified: boolean;

  @Expose()
  @ApiProperty({
    description: 'Email address of the user. Present for B2B accounts.',
    example: 'owner@glamoursalon.in',
    required: false,
    nullable: true,
  })
  email: string | null;

  @Expose()
  @ApiProperty({
    description: 'RBAC role assigned to the user.',
    enum: UserRole,
    example: UserRole.CUSTOMER,
  })
  role: UserRole;

  @Expose()
  @ApiProperty({
    description: 'Whether the account is active. Inactive accounts cannot log in.',
    example: true,
  })
  isActive: boolean;

  @Expose()
  @ApiProperty({
    description: 'ISO 8601 timestamp of account creation.',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;
}

// ─── Auth Response ─────────────────────────────────────────────────────────────

/**
 * AuthResponseDto — response envelope for all successful authentication actions:
 *   - `POST /v1/auth/otp/verify`
 *   - `POST /v1/auth/login`
 *   - `POST /v1/auth/token/refresh`
 *
 * Token delivery (Phase 5 §5.2):
 *  - `accessToken`  → response body (consumed by web/mobile Authorization header).
 *  - `refreshToken` → response body (mobile apps) AND set as HttpOnly secure cookie (web).
 *
 * Sensitive internal fields are NOT exposed in this response.
 * The controller uses `plainToInstance(AuthResponseDto, data, { excludeExtraneousValues: true })`
 * to ensure `@Exclude()` / `@Expose()` decorators take effect.
 */
@Exclude()
export class AuthResponseDto {
  @Expose()
  @ApiProperty({
    description:
      'Short-lived JWT access token (15-minute expiry). ' +
      'Include in every protected API request as `Authorization: Bearer <token>`.',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhM2Q5ZjJjMS1iMDRlLTcyNGQtODU5My1jMTdiMmQ2ZTBmOWEiLCJyb2xlIjoiQ1VTVE9NRVIiLCJzZXNzaW9uSWQiOiJmNDdhYzEwYi01OGNjLTQzNzItYTU2Ny0wZTAyYjJjM2Q0NzkiLCJ2ZXJzaW9uIjoxLCJpYXQiOjE3MDcwMDAwMDAsImV4cCI6MTcwNzAwMDkwMH0.signature',
  })
  accessToken: string;

  @Expose()
  @ApiProperty({
    description:
      'Opaque UUID refresh token (30-day expiry). ' +
      'Mobile clients: store securely and submit via request body on `/auth/token/refresh`. ' +
      'Web clients: also set as an HttpOnly secure cookie automatically.',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    format: 'uuid',
  })
  refreshToken: string;

  @Expose()
  @ApiProperty({
    description: 'Access token expiry in seconds from time of issuance (900 = 15 minutes).',
    example: 900,
  })
  expiresIn: number;

  @Expose()
  @Type(() => AuthUserDto)
  @ApiProperty({
    description: 'Safe public profile of the authenticated user.',
    type: () => AuthUserDto,
  })
  user: AuthUserDto;
}
