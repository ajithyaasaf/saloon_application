import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';

/**
 * UpdateCategoryDto — Request body for updating a master service category.
 * Requires `version` for optimistic concurrency control.
 *
 * Architecture ref: Phase 11.0 & Phase 11.2
 */
export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Hair Styling & Treatments', description: 'Updated category name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 2, description: 'Updated display order' })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', description: 'Updated icon media ID' })
  @IsOptional()
  @IsUUID()
  iconMediaId?: string;

  @ApiProperty({ example: 1, description: 'Expected aggregate version for optimistic concurrency control' })
  @IsInt()
  @Min(1)
  version: number;
}
