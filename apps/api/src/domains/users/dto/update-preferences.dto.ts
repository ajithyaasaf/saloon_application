import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

// IANA timezone examples for documentation
const TIMEZONE_EXAMPLE = 'Asia/Kolkata';

/**
 * UpdatePreferencesDto — request body for `PATCH /v1/users/me/preferences`.
 *
 * Manages locale and consent preferences. Notification channel preferences
 * are intentionally excluded and reserved for the future UserPreferences table.
 *
 * Architecture ref: Phase 8.0 §6 — notificationChannels NOT included by design.
 */
export class UpdatePreferencesDto {
  @ApiProperty({
    description:
      'Preferred language for notifications and UI. ' +
      'ISO 639-1 two-letter language code (e.g. en, hi, ta, te, mr, bn).',
    example: 'hi',
    maxLength: 10,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10, { message: 'preferredLanguage must be at most 10 characters' })
  @Matches(/^[a-zA-Z]{2,5}(-[a-zA-Z]{2,4})?$/, {
    message: 'preferredLanguage must be a valid ISO 639-1 language code (e.g. en, hi, ta)',
  })
  preferredLanguage?: string;

  @ApiProperty({
    description:
      'Preferred timezone for scheduling and notifications. ' +
      'Must be a valid IANA timezone identifier.',
    example: TIMEZONE_EXAMPLE,
    maxLength: 60,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(60, { message: 'timezone must be at most 60 characters' })
  @Matches(/^[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?$/, {
    message:
      'timezone must be a valid IANA timezone identifier (e.g. Asia/Kolkata, America/New_York)',
  })
  timezone?: string;

  @ApiProperty({
    description:
      'Whether the user consents to receive marketing communications. ' +
      'Defaults to false. Required for DPDP Act compliance.',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'marketingOptIn must be a boolean value' })
  marketingOptIn?: boolean;
}
