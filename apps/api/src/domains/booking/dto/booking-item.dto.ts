import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from '@prisma/client';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class BookingItemDto {
  @ApiProperty({ description: 'Booking item ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Parent Booking ID', example: '123e4567-e89b-12d3-a456-426614174001' })
  @Expose()
  bookingId: string;

  @ApiProperty({ description: 'Branch Service ID', example: '123e4567-e89b-12d3-a456-426614174002' })
  @Expose()
  branchServiceId: string;

  @ApiProperty({ description: 'Assigned Staff ID', example: '123e4567-e89b-12d3-a456-426614174003' })
  @Expose()
  staffId: string;

  @ApiProperty({ description: 'Execution sequence order', example: 1 })
  @Expose()
  sequenceOrder: number;

  @ApiProperty({ description: 'Start time UTC', example: '2026-08-08T10:00:00.000Z' })
  @Expose()
  startTime: Date;

  @ApiProperty({ description: 'End time UTC', example: '2026-08-08T11:00:00.000Z' })
  @Expose()
  endTime: Date;

  @ApiProperty({ description: 'Service duration in minutes', example: 60 })
  @Expose()
  serviceDurationMinutes: number;

  @ApiProperty({ description: 'Prep time in minutes', example: 5 })
  @Expose()
  prepTimeMinutes: number;

  @ApiProperty({ description: 'Cleanup time in minutes', example: 5 })
  @Expose()
  cleanupTimeMinutes: number;

  @ApiProperty({ description: 'Buffer time in minutes', example: 10 })
  @Expose()
  bufferTimeMinutes: number;

  @ApiProperty({ description: 'Unit price in minor units', example: 150000 })
  @Expose()
  unitPrice: number;

  @ApiProperty({ description: 'Discount amount in minor units', example: 0 })
  @Expose()
  discountAmount: number;

  @ApiProperty({ description: 'Final price in minor units', example: 150000 })
  @Expose()
  finalPrice: number;

  @ApiProperty({ enum: BookingStatus, example: BookingStatus.PENDING })
  @Expose()
  status: BookingStatus;

  @ApiProperty({ description: 'Created timestamp' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  @Expose()
  updatedAt: Date;
}
