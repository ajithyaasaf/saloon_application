import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

// Allowed sort fields for user listing
const ALLOWED_SORT_BY = ['createdAt', 'firstName', 'role'] as const;
type SortBy = (typeof ALLOWED_SORT_BY)[number];

/**
 * AdminListUsersDto — query parameters for `GET /v1/users` (admin).
 *
 * Provides paginated, filtered, and sorted user listing for SUPER_ADMIN
 * and SUPPORT_AGENT roles.
 *
 * Architecture ref: Phase 8.0 §6, §7, §8.2
 */
export class AdminListUsersDto {
  @ApiProperty({
    description: 'Page number (1-indexed).',
    minimum: 1,
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  page?: number = 1;

  @ApiProperty({
    description: 'Number of results per page (max 100).',
    minimum: 1,
    maximum: 100,
    default: 20,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(100, { message: 'limit must be at most 100' })
  limit?: number = 20;

  @ApiProperty({
    description: 'Filter by user role.',
    enum: UserRole,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserRole, {
    message: `role must be one of: ${Object.values(UserRole).join(', ')}`,
  })
  role?: UserRole;

  @ApiProperty({
    description: 'Filter by account active status.',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean({ message: 'isActive must be a boolean (true or false)' })
  isActive?: boolean;

  @ApiProperty({
    description:
      'Full-text search term. Matches against firstName, lastName, email, and phone.',
    example: 'priya',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Field to sort by.',
    enum: ALLOWED_SORT_BY,
    default: 'createdAt',
    required: false,
  })
  @IsOptional()
  @IsIn(ALLOWED_SORT_BY, {
    message: `sortBy must be one of: ${ALLOWED_SORT_BY.join(', ')}`,
  })
  sortBy?: SortBy = 'createdAt';

  @ApiProperty({
    description: 'Sort direction.',
    enum: ['asc', 'desc'],
    default: 'desc',
    required: false,
  })
  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'sortDir must be asc or desc' })
  sortDir?: 'asc' | 'desc' = 'desc';
}
