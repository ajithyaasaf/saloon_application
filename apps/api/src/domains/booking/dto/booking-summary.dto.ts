import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus, PaymentStatus, WalkInType } from '@prisma/client';
import { Exclude, Expose, Transform } from 'class-transformer';

@Exclude()
export class BookingSummaryDto {
  @ApiProperty({ description: 'Booking UUID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Human-readable booking code', example: 'BK-20260807-A92F' })
  @Expose()
  bookingCode: string;

  @ApiProperty({ description: 'Per-salon sequence number', example: '1042' })
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

  @ApiProperty({ enum: WalkInType })
  @Expose()
  walkInType: WalkInType;

  @ApiProperty({ enum: BookingStatus })
  @Expose()
  status: BookingStatus;

  @ApiProperty({ enum: PaymentStatus })
  @Expose()
  paymentStatus: PaymentStatus;

  @ApiProperty({ description: 'Booking date (YYYY-MM-DD)' })
  @Expose()
  bookingDate: Date;

  @ApiProperty({ description: 'Start time UTC' })
  @Expose()
  startTime: Date;

  @ApiProperty({ description: 'End time UTC' })
  @Expose()
  endTime: Date;

  @ApiProperty({ description: 'Total amount in minor currency units' })
  @Expose()
  totalAmount: number;

  @ApiProperty({ description: 'Currency ISO code' })
  @Expose()
  currency: string;

  @ApiProperty({ description: 'Creation timestamp' })
  @Expose()
  createdAt: Date;
}
