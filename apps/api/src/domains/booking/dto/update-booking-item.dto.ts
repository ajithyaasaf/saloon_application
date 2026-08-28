import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class UpdateBookingItemDto {
  @ApiProperty({ description: 'Expected version for optimistic locking', example: 1 })
  @IsInt()
  @Min(1)
  version: number;

  @ApiPropertyOptional({ description: 'Assigned staff ID' })
  @IsOptional()
  @IsUUID()
  staffId?: string;

  @ApiPropertyOptional({ description: 'Execution sequence order' })
  @IsOptional()
  @IsInt()
  @Min(1)
  sequenceOrder?: number;

  @ApiPropertyOptional({ description: 'Start time UTC' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startTime?: Date;

  @ApiPropertyOptional({ description: 'End time UTC' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endTime?: Date;

  @ApiPropertyOptional({ description: 'Service duration in minutes' })
  @IsOptional()
  @IsInt()
  @Min(1)
  serviceDurationMinutes?: number;

  @ApiPropertyOptional({ description: 'Prep time in minutes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  prepTimeMinutes?: number;

  @ApiPropertyOptional({ description: 'Cleanup time in minutes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  cleanupTimeMinutes?: number;

  @ApiPropertyOptional({ description: 'Buffer time in minutes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  bufferTimeMinutes?: number;

  @ApiPropertyOptional({ description: 'Unit price in minor currency units' })
  @IsOptional()
  @IsInt()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional({ description: 'Discount amount in minor currency units' })
  @IsOptional()
  @IsInt()
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional({ description: 'Final price in minor currency units' })
  @IsOptional()
  @IsInt()
  @Min(0)
  finalPrice?: number;

  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({ description: 'User ID updating this item' })
  @IsOptional()
  @IsUUID()
  updatedByUserId?: string;
}
