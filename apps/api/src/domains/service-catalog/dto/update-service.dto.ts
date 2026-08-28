import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BranchGenderCategory } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';

/**
 * UpdateServiceDto — Request body for updating a master service definition.
 * Requires `version` for optimistic concurrency control.
 *
 * Architecture ref: Phase 11.0 & Phase 11.2
 */
export class UpdateServiceDto {
  @ApiPropertyOptional({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'Updated category ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: "Men's Premium Haircut & Wash", description: 'Updated service name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description', description: 'Updated service description' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ enum: BranchGenderCategory, description: 'Updated gender demographic' })
  @IsOptional()
  @IsEnum(BranchGenderCategory)
  genderCategory?: BranchGenderCategory;

  @ApiPropertyOptional({ example: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', description: 'Updated cover media ID' })
  @IsOptional()
  @IsUUID()
  coverMediaId?: string;

  @ApiProperty({ example: 1, description: 'Expected aggregate version for optimistic concurrency control' })
  @IsInt()
  @Min(1)
  version: number;
}
