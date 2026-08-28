import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Exclude, Expose } from 'class-transformer';

/**
 * UserSummaryDto — compact user representation for paginated admin list.
 *
 * Returns only the minimal fields needed for listing.
 * Never includes PII beyond what is needed for identification.
 *
 * Architecture ref: Phase 8.0 §6, §9.2
 */
@Exclude()
export class UserSummaryDto {
  @ApiProperty({ description: 'User unique identifier (UUID).' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'First name.' })
  @Expose()
  firstName: string;

  @ApiProperty({ description: 'Last name.', nullable: true })
  @Expose()
  lastName: string | null;

  @ApiProperty({ description: 'Email address.', nullable: true })
  @Expose()
  email: string | null;

  @ApiProperty({ description: 'Phone number.' })
  @Expose()
  phone: string;

  @ApiProperty({ description: 'Account role.', enum: UserRole })
  @Expose()
  role: UserRole;

  @ApiProperty({ description: 'Whether the account is active.' })
  @Expose()
  isActive: boolean;

  @ApiProperty({ description: 'Account creation timestamp.' })
  @Expose()
  createdAt: Date;
}

/**
 * PaginationMetaDto — pagination metadata envelope.
 */
export class PaginationMetaDto {
  @ApiProperty({ description: 'Total number of users matching the filter.' })
  total: number;

  @ApiProperty({ description: 'Current page number.' })
  page: number;

  @ApiProperty({ description: 'Number of results per page.' })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages.',
    example: 5,
  })
  totalPages: number;
}

/**
 * PaginatedUsersDto — paginated wrapper for admin user list response.
 *
 * TransformInterceptor promotes `pagination` into the response `meta` block.
 */
export class PaginatedUsersDto {
  @ApiProperty({ type: () => [UserSummaryDto] })
  data: UserSummaryDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  pagination: PaginationMetaDto;
}
