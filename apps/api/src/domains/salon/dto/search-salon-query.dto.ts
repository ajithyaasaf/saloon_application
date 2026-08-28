import { ApiPropertyOptional } from '@nestjs/swagger';
import { BranchGenderCategory, SalonPlanType, SalonStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

/**
 * SearchSalonQueryDto — Query specifications for filtering, searching, and paginating salons.
 *
 * Architecture ref: Phase 10.0 §7
 */
export class SearchSalonQueryDto {
  @ApiPropertyOptional({ description: 'Search term for salon name or description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by city' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ enum: SalonStatus, description: 'Filter by salon status' })
  @IsOptional()
  @IsEnum(SalonStatus)
  status?: SalonStatus;

  @ApiPropertyOptional({ enum: SalonPlanType, description: 'Filter by plan type' })
  @IsOptional()
  @IsEnum(SalonPlanType)
  planType?: SalonPlanType;

  @ApiPropertyOptional({ enum: BranchGenderCategory, description: 'Filter by gender category' })
  @IsOptional()
  @IsEnum(BranchGenderCategory)
  genderCategory?: BranchGenderCategory;

  @ApiPropertyOptional({ description: 'Filter by owner ID' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ description: 'Minimum rating (1.0 - 5.0)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ description: 'Latitude coordinate' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude coordinate' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Search radius in km (1 - 50)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  radiusKm?: number;

  @ApiPropertyOptional({ description: 'Filter for salons currently open' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  openNow?: boolean;

  @ApiPropertyOptional({ example: 1, default: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, description: 'Items per page (max 100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: ['distance', 'rating', 'newest', 'popular'], description: 'Sort criteria' })
  @IsOptional()
  @IsEnum(['distance', 'rating', 'newest', 'popular'])
  sortBy?: 'distance' | 'rating' | 'newest' | 'popular';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC', description: 'Sort order' })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
