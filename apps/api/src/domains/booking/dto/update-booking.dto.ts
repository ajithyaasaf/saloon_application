import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class UpdateBookingDto {
  @ApiProperty({ description: 'Expected version for optimistic concurrency control', example: 1 })
  @IsInt()
  @Min(1)
  version: number;

  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ description: 'Reason for cancellation' })
  @IsOptional()
  @IsString()
  cancellationReason?: string;

  @ApiPropertyOptional({ description: 'User ID who cancelled booking' })
  @IsOptional()
  @IsUUID()
  cancelledByUserId?: string;

  @ApiPropertyOptional({ description: 'Cancellation timestamp' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  cancelledAt?: Date;

  @ApiPropertyOptional({ description: 'Reschedule count' })
  @IsOptional()
  @IsInt()
  @Min(0)
  rescheduleCount?: number;

  @ApiPropertyOptional({ description: 'Booking date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  bookingDate?: Date;

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

  @ApiPropertyOptional({ description: 'Total duration in minutes' })
  @IsOptional()
  @IsInt()
  @Min(1)
  totalDurationMinutes?: number;

  @ApiPropertyOptional({ description: 'Subtotal in minor units' })
  @IsOptional()
  @IsInt()
  @Min(0)
  subtotalAmount?: number;

  @ApiPropertyOptional({ description: 'Tax amount in minor units' })
  @IsOptional()
  @IsInt()
  @Min(0)
  taxAmount?: number;

  @ApiPropertyOptional({ description: 'Discount amount in minor units' })
  @IsOptional()
  @IsInt()
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional({ description: 'Total amount in minor units' })
  @IsOptional()
  @IsInt()
  @Min(0)
  totalAmount?: number;

  @ApiPropertyOptional({ description: 'Payment ID' })
  @IsOptional()
  @IsUUID()
  paymentId?: string;

  @ApiPropertyOptional({ description: 'Coupon ID' })
  @IsOptional()
  @IsUUID()
  couponId?: string;

  @ApiPropertyOptional({ description: 'Review ID' })
  @IsOptional()
  @IsUUID()
  reviewId?: string;

  @ApiPropertyOptional({ description: 'Customer notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Internal notes' })
  @IsOptional()
  @IsString()
  internalNotes?: string;

  @ApiPropertyOptional({ description: 'User ID performing update' })
  @IsOptional()
  @IsUUID()
  updatedByUserId?: string;
}
