import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * AdminUpdateUserDto — request body for `PATCH /v1/users/:userId` (admin).
 *
 * Allows SUPER_ADMIN to patch a user's role, active status, and name fields.
 * All fields are optional. Only provided fields are updated.
 *
 * Architecture ref: Phase 8.0 §6, §9.7
 */
export class AdminUpdateUserDto {
  @ApiProperty({
    description: 'New role to assign to the user.',
    enum: UserRole,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserRole, {
    message: `role must be one of: ${Object.values(UserRole).join(', ')}`,
  })
  role?: UserRole;

  @ApiProperty({
    description: 'Activate or deactivate the user account.',
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean value' })
  isActive?: boolean;

  @ApiProperty({
    description: 'Override the user first name (admin correction).',
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
    description: 'Override the user last name (admin correction).',
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
}
