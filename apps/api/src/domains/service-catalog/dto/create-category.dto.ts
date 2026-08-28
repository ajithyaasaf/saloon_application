import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';

/**
 * CreateCategoryDto — Request body for creating a master service category.
 *
 * Architecture ref: Phase 11.0 & Phase 11.2
 */
export class CreateCategoryDto {
  @ApiProperty({ example: 'Hair Styling', description: 'Name of the master service category' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 1, description: 'Display ordering priority' })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'Icon media ID' })
  @IsOptional()
  @IsUUID()
  iconMediaId?: string;
}
