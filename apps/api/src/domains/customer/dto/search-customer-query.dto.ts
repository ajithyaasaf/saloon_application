import { ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerStatus, MembershipStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export enum CustomerSortBy {
  CREATED_AT = 'createdAt',
  NAME = 'firstName',
  LIFETIME_SPEND = 'lifetimeSpend',
  LAST_VISIT = 'lastVisitAt',
  TOTAL_VISITS = 'totalVisits',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class SearchCustomerQueryDto {
  @ApiPropertyOptional({ description: 'Page number for pagination', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of items per page', default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Salon ID filter' })
  @IsOptional()
  @IsUUID()
  salonId?: string;

  @ApiPropertyOptional({ description: 'Branch ID filter' })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Search term for name, phone, email, or customerCode' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Customer Status filter', enum: CustomerStatus })
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @ApiPropertyOptional({ description: 'Active Membership Status filter', enum: MembershipStatus })
  @IsOptional()
  @IsEnum(MembershipStatus)
  membershipStatus?: MembershipStatus;

  @ApiPropertyOptional({ description: 'Loyalty Tier filter (e.g. SILVER, GOLD, PLATINUM)' })
  @IsOptional()
  @IsString()
  loyaltyTier?: string;

  @ApiPropertyOptional({ description: 'Filter blacklisted customers only' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  blacklisted?: boolean;

  @ApiPropertyOptional({ description: 'Tag ID filter' })
  @IsOptional()
  @IsUUID()
  tagId?: string;

  @ApiPropertyOptional({ description: 'Sort by field', enum: CustomerSortBy, default: CustomerSortBy.CREATED_AT })
  @IsOptional()
  @IsEnum(CustomerSortBy)
  sortBy?: CustomerSortBy = CustomerSortBy.CREATED_AT;

  @ApiPropertyOptional({ description: 'Sort order', enum: SortOrder, default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}
