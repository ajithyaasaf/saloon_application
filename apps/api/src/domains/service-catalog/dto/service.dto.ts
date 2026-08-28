import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BranchGenderCategory } from '@prisma/client';
import { Exclude, Expose } from 'class-transformer';

/**
 * ServiceDto — Response representation for master service definition.
 * Hides internal audit and soft-delete fields.
 *
 * Architecture ref: Phase 11.0 & Phase 11.2
 */
@Exclude()
export class ServiceDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22' })
  @Expose()
  categoryId: string;

  @ApiProperty({ example: "Men's Classic Haircut" })
  @Expose()
  name: string;

  @ApiPropertyOptional({ example: 'Scissor haircut and styling' })
  @Expose()
  description?: string;

  @ApiProperty({ enum: BranchGenderCategory, example: BranchGenderCategory.UNISEX })
  @Expose()
  genderCategory: BranchGenderCategory;

  @ApiPropertyOptional({ example: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33' })
  @Expose()
  coverMediaId?: string;

  @ApiProperty({ example: '2026-08-06T10:00:00.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2026-08-06T10:00:00.000Z' })
  @Expose()
  updatedAt: Date;
}
