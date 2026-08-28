import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

/**
 * ServiceCategoryDto — Response representation for master service category.
 * Hides internal audit and soft-delete fields.
 *
 * Architecture ref: Phase 11.0 & Phase 11.2
 */
@Exclude()
export class ServiceCategoryDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'Hair Styling' })
  @Expose()
  name: string;

  @ApiProperty({ example: 1 })
  @Expose()
  displayOrder: number;

  @ApiPropertyOptional({ example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22' })
  @Expose()
  iconMediaId?: string;

  @ApiProperty({ example: '2026-08-06T10:00:00.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2026-08-06T10:00:00.000Z' })
  @Expose()
  updatedAt: Date;
}
