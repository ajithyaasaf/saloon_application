import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BranchGenderCategory } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

/**
 * CreateServiceDto — Request body for creating a master service definition.
 *
 * Architecture ref: Phase 11.0 & Phase 11.2
 */
export class CreateServiceDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'Category ID' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: "Men's Classic Haircut", description: 'Name of the service' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Classic scissor haircut with styling and hair wash', description: 'Service description' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ enum: BranchGenderCategory, default: BranchGenderCategory.UNISEX, description: 'Target gender demographic' })
  @IsOptional()
  @IsEnum(BranchGenderCategory)
  genderCategory?: BranchGenderCategory;

  @ApiPropertyOptional({ example: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', description: 'Cover image media ID' })
  @IsOptional()
  @IsUUID()
  coverMediaId?: string;
}
