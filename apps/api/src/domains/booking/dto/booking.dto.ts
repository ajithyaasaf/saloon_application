import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus, PaymentStatus, WalkInType } from '@prisma/client';
import { Exclude, Expose, Transform } from 'class-transformer';

@Exclude()
export class BookingDto {
  @ApiProperty({ description: 'Booking UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Global human-readable booking code', example: 'BK-20260807-A92F' })
  @Expose()
  bookingCode: string;

  @ApiProperty({ description: 'Per-salon sequential counter', example: '1042' })
  @Expose()
  @Transform(({ value }) => (typeof value === 'bigint' ? value.toString() : value))
  sequenceNumber: string;

  @ApiProperty({ description: 'Salon ID' })
  @Expose()
  salonId: string;

  @ApiProperty({ description: 'Branch ID' })
  @Expose()
  branchId: string;

  @ApiProperty({ description: 'Customer ID' })
  @Expose()
  customerId: string;

  @ApiProperty({ enum: WalkInType, example: WalkInType.NONE })
  @Expose()
  walkInType: WalkInType;

  @ApiProperty({ description: 'Whether booking is a POS walk-in', example: false })
  @Expose()
  isWalkIn: boolean;

  @ApiProperty({ enum: BookingStatus, example: BookingStatus.PENDING })
  @Expose()
  status: BookingStatus;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.UNPAID })
  @Expose()
  paymentStatus: PaymentStatus;

  @ApiPropertyOptional({ description: 'Reason for cancellation' })
  @Expose()
  cancellationReason?: string;

  @ApiPropertyOptional({ description: 'User ID who cancelled booking' })
  @Expose()
  cancelledByUserId?: string;

  @ApiPropertyOptional({ description: 'Cancellation timestamp' })
  @Expose()
  cancelledAt?: Date;

  @ApiProperty({ description: 'Number of times rescheduled', example: 0 })
  @Expose()
  rescheduleCount: number;

  @ApiProperty({ description: 'Booking date (YYYY-MM-DD)', example: '2026-08-08' })
  @Expose()
  bookingDate: Date;

  @ApiProperty({ description: 'Aggregate start time UTC' })
  @Expose()
  startTime: Date;

  @ApiProperty({ description: 'Aggregate end time UTC' })
  @Expose()
  endTime: Date;

  @ApiProperty({ description: 'Total duration in minutes', example: 60 })
  @Expose()
  totalDurationMinutes: number;

  @ApiProperty({ description: 'Subtotal in minor currency units', example: 150000 })
  @Expose()
  subtotalAmount: number;

  @ApiProperty({ description: 'Tax amount in minor currency units', example: 27000 })
  @Expose()
  taxAmount: number;

  @ApiProperty({ description: 'Discount amount in minor currency units', example: 0 })
  @Expose()
  discountAmount: number;

  @ApiProperty({ description: 'Total amount in minor currency units', example: 177000 })
  @Expose()
  totalAmount: number;

  @ApiProperty({ description: 'Currency ISO-4217 code', example: 'INR' })
  @Expose()
  currency: string;

  @ApiPropertyOptional({ description: 'Reserved Payment ID (Phase 14)' })
  @Expose()
  paymentId?: string;

  @ApiPropertyOptional({ description: 'Reserved Coupon ID (Phase 16)' })
  @Expose()
  couponId?: string;

  @ApiPropertyOptional({ description: 'Reserved Review ID (Phase 17)' })
  @Expose()
  reviewId?: string;

  @ApiPropertyOptional({ description: 'Customer notes' })
  @Expose()
  notes?: string;

  @ApiPropertyOptional({ description: 'Salon internal notes' })
  @Expose()
  internalNotes?: string;

  @ApiPropertyOptional({ description: 'Client IP address' })
  @Expose()
  clientIp?: string;

  @ApiPropertyOptional({ description: 'Client User-Agent string' })
  @Expose()
  userAgent?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @Expose()
  updatedAt: Date;
}
