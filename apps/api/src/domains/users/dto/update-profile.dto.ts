import { ApiProperty } from '@nestjs/swagger';
import { Gender } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * UpdateProfileDto — request body for `PATCH /v1/users/me/profile`.
 *
 * All fields are optional. Only provided fields are patched.
 * Global TrimStringsPipe handles leading/trailing whitespace.
 *
 * Architecture ref: Phase 8.0 §6, §7
 */
export class UpdateProfileDto {
  @ApiProperty({
    description: 'User first name. 2–50 characters, letters and spaces only.',
    example: 'Priya',
    minLength: 2,
    maxLength: 50,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'firstName must be at least 2 characters' })
  @MaxLength(50, { message: 'firstName must be at most 50 characters' })
  @Matches(/^[a-zA-Z\s]+$/, {
    message: 'firstName must contain only letters and spaces',
  })
  firstName?: string;

  @ApiProperty({
    description: 'User last name. 1–50 characters, letters and spaces only.',
    example: 'Sharma',
    minLength: 1,
    maxLength: 50,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'lastName must be at least 1 character' })
  @MaxLength(50, { message: 'lastName must be at most 50 characters' })
  @Matches(/^[a-zA-Z\s]+$/, {
    message: 'lastName must contain only letters and spaces',
  })
  lastName?: string;

  @ApiProperty({
    description:
      'Optional display name shown publicly. ' +
      '2–60 characters. Alphanumeric, spaces, hyphens, underscores.',
    example: 'priya_sharma',
    minLength: 2,
    maxLength: 60,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'displayName must be at least 2 characters' })
  @MaxLength(60, { message: 'displayName must be at most 60 characters' })
  @Matches(/^[a-zA-Z0-9\s\-_]+$/, {
    message:
      'displayName must contain only alphanumeric characters, spaces, hyphens, or underscores',
  })
  displayName?: string;

  @ApiProperty({
    description: 'User gender identity.',
    enum: Gender,
    example: Gender.FEMALE,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsEnum(Gender, {
    message: `gender must be one of: ${Object.values(Gender).join(', ')}`,
  })
  gender?: Gender;

  @ApiProperty({
    description:
      'Date of birth in ISO 8601 format (YYYY-MM-DD). ' +
      'User must be at least 13 years old.',
    example: '1995-06-15',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      return new Date(value);
    }
    return value;
  })
  @IsDate({ message: 'dateOfBirth must be a valid date string (YYYY-MM-DD)' })
  dateOfBirth?: Date;
}
