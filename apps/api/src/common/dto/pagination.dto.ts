import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * PaginationDto — base DTO for all list/paginated endpoints.
 * Applied as a query DTO via @Query() in controllers.
 *
 * Architecture ref: Phase 5 §13.3
 * Defaults: page=1, limit=20, sortBy=createdAt, sortOrder=desc
 */
export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsString()
  sortOrder: 'asc' | 'desc' = 'desc';
}

/**
 * IdParamDto — validates that a route :id parameter is a valid UUID.
 */
export class IdParamDto {
  @ApiPropertyOptional({ description: 'Resource UUID', format: 'uuid' })
  @IsString()
  id: string;
}
