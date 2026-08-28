import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateBookingItemDto {
  @ApiProperty({ description: 'Branch service ID' })
  @IsUUID()
  branchServiceId: string;

  @ApiProperty({ description: 'Assigned staff ID' })
  @IsUUID()
  staffId: string;

  @ApiPropertyOptional({ description: 'Execution sequence order', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  sequenceOrder?: number = 1;

  @ApiProperty({ description: 'Start time UTC' })
  @Type(() => Date)
  @IsDate()
  startTime: Date;

  @ApiProperty({ description: 'End time UTC' })
  @Type(() => Date)
  @IsDate()
  endTime: Date;

  @ApiProperty({ description: 'Service duration in minutes' })
  @IsInt()
  @Min(1)
  serviceDurationMinutes: number;

  @ApiPropertyOptional({ description: 'Prep time in minutes', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  prepTimeMinutes?: number = 0;

  @ApiPropertyOptional({ description: 'Cleanup time in minutes', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  cleanupTimeMinutes?: number = 0;

  @ApiPropertyOptional({ description: 'Buffer time in minutes', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  bufferTimeMinutes?: number = 0;

  @ApiProperty({ description: 'Unit price in minor currency units' })
  @IsInt()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ description: 'Discount amount in minor currency units', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  discountAmount?: number = 0;

  @ApiProperty({ description: 'Final price in minor currency units' })
  @IsInt()
  @Min(0)
  finalPrice: number;

  @ApiPropertyOptional({ enum: BookingStatus, default: BookingStatus.PENDING })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus = BookingStatus.PENDING;

  @ApiProperty({ description: 'User ID creating this item' })
  @IsUUID()
  createdByUserId: string;
}
