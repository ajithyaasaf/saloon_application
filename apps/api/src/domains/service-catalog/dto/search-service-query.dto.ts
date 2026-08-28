import { ApiPropertyOptional } from '@nestjs/swagger';
import { BranchGenderCategory, ServiceStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

/**
 * SearchServiceQueryDto — Query parameters for searching, filtering, and sorting services.
 *
 * Architecture ref: Phase 11.0 & Phase 11.2
 */
export class SearchServiceQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10, description: 'Items per page (max 100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ example: 'Haircut', description: 'Search term for name and description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'Filter by Category ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ enum: BranchGenderCategory, description: 'Filter by gender demographic' })
  @IsOptional()
  @IsEnum(BranchGenderCategory)
  genderCategory?: BranchGenderCategory;

  @ApiPropertyOptional({ enum: ServiceStatus, description: 'Filter by service status' })
  @IsOptional()
  @IsEnum(ServiceStatus)
  status?: ServiceStatus;

  @ApiPropertyOptional({ example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', description: 'Filter by Branch ID' })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ example: 'name', description: 'Field to sort by (name, createdAt)' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC', description: 'Sort direction' })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortDir?: 'ASC' | 'DESC' = 'DESC';
}
