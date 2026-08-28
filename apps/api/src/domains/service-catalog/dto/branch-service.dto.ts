import { ApiProperty } from '@nestjs/swagger';
import { ServiceStatus } from '@prisma/client';
import { Exclude, Expose, Transform } from 'class-transformer';

/**
 * BranchServiceDto — Response representation for branch service offering.
 * Hides internal audit and soft-delete fields. Converts Decimal to number.
 *
 * Architecture ref: Phase 11.0 & Phase 11.2
 */
@Exclude()
export class BranchServiceDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22' })
  @Expose()
  branchId: string;

  @ApiProperty({ example: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33' })
  @Expose()
  serviceId: string;

  @ApiProperty({ example: 450.0 })
  @Expose()
  @Transform(({ value }) => (value ? Number(value) : value))
  price: number;

  @ApiProperty({ example: 45 })
  @Expose()
  durationMinutes: number;

  @ApiProperty({ enum: ServiceStatus, example: ServiceStatus.ACTIVE })
  @Expose()
  status: ServiceStatus;

  @ApiProperty({ example: true })
  @Expose()
  isActive: boolean;

  @ApiProperty({ example: '2026-08-06T10:00:00.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2026-08-06T10:00:00.000Z' })
  @Expose()
  updatedAt: Date;
}
