import { ApiProperty } from '@nestjs/swagger';
import { Gender, UserRole } from '@prisma/client';
import { Exclude, Expose, Transform } from 'class-transformer';

/**
 * AvatarDto — nested avatar representation in UserProfileDto.
 */
export class AvatarDto {
  @ApiProperty({ description: 'Full-resolution avatar URL.' })
  @Expose()
  url: string;

  @ApiProperty({
    description: 'Thumbnail avatar URL (if available).',
    nullable: true,
  })
  @Expose()
  thumbnailUrl: string | null;
}

/**
 * UserProfileDto — response shape for `GET /v1/users/me` and admin profile views.
 *
 * Sensitive fields (passwordHash, version, deletedAt, avatarMediaId,
 * createdById, updatedById) are excluded via @Exclude().
 * Only @Expose() fields are serialized.
 *
 * Architecture ref: Phase 8.0 §6, §9.2
 */
@Exclude()
export class UserProfileDto {
  @ApiProperty({ description: 'User unique identifier (UUID).' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'First name.' })
  @Expose()
  firstName: string;

  @ApiProperty({ description: 'Last name.', nullable: true })
  @Expose()
  lastName: string | null;

  @ApiProperty({ description: 'Display name.', nullable: true })
  @Expose()
  displayName: string | null;

  @ApiProperty({ description: 'Email address.', nullable: true })
  @Expose()
  email: string | null;

  @ApiProperty({ description: 'Whether the email address has been verified.' })
  @Expose()
  emailVerified: boolean;

  @ApiProperty({ description: 'Phone number (10-digit Indian mobile).' })
  @Expose()
  phone: string;

  @ApiProperty({ description: 'Whether the phone number has been verified.' })
  @Expose()
  phoneVerified: boolean;

  @ApiProperty({ description: 'Account role.', enum: UserRole })
  @Expose()
  role: UserRole;

  @ApiProperty({ description: 'Whether the account is active.' })
  @Expose()
  isActive: boolean;

  @ApiProperty({ description: 'Gender identity.', enum: Gender, nullable: true })
  @Expose()
  gender: Gender | null;

  @ApiProperty({ description: 'Date of birth.', nullable: true })
  @Expose()
  @Transform(({ value }: { value: Date | null }) =>
    value ? value.toISOString().split('T')[0] : null,
  )
  dateOfBirth: Date | null;

  @ApiProperty({
    description: 'Profile avatar URLs.',
    type: () => AvatarDto,
    nullable: true,
  })
  @Expose()
  avatar: AvatarDto | null;

  @ApiProperty({
    description: 'ISO 639-1 preferred language code.',
    nullable: true,
    example: 'hi',
  })
  @Expose()
  preferredLanguage: string | null;

  @ApiProperty({
    description: 'IANA timezone identifier.',
    nullable: true,
    example: 'Asia/Kolkata',
  })
  @Expose()
  timezone: string | null;

  @ApiProperty({
    description: 'Whether the user has opted in to marketing communications.',
  })
  @Expose()
  marketingOptIn: boolean;

  @ApiProperty({ description: 'Account creation timestamp.' })
  @Expose()
  createdAt: Date;
}
