import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus, PaymentStatus, WalkInType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateBookingItemDto } from './create-booking-item.dto';

export class CreateBookingDto {
  @ApiProperty({ description: 'Global human-readable booking code', example: 'BK-20260807-A92F' })
  @IsString()
  bookingCode: string;

  @ApiProperty({ description: 'Per-salon sequential counter', example: 1042 })
  sequenceNumber: bigint | number;

  @ApiProperty({ description: 'Salon ID' })
  @IsUUID()
  salonId: string;

  @ApiProperty({ description: 'Branch ID' })
  @IsUUID()
  branchId: string;

  @ApiProperty({ description: 'Customer User ID' })
  @IsUUID()
  customerId: string;

  @ApiPropertyOptional({ enum: WalkInType, default: WalkInType.NONE })
  @IsOptional()
  @IsEnum(WalkInType)
  walkInType?: WalkInType = WalkInType.NONE;

  @ApiPropertyOptional({ description: 'Whether booking is a walk-in', default: false })
  @IsOptional()
  @IsBoolean()
  isWalkIn?: boolean = false;

  @ApiPropertyOptional({ enum: BookingStatus, default: BookingStatus.PENDING })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus = BookingStatus.PENDING;

  @ApiPropertyOptional({ enum: PaymentStatus, default: PaymentStatus.UNPAID })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus = PaymentStatus.UNPAID;

  @ApiProperty({ description: 'Booking date (YYYY-MM-DD)' })
  @Type(() => Date)
  @IsDate()
  bookingDate: Date;

  @ApiProperty({ description: 'Start time UTC' })
  @Type(() => Date)
  @IsDate()
  startTime: Date;

  @ApiProperty({ description: 'End time UTC' })
  @Type(() => Date)
  @IsDate()
  endTime: Date;

  @ApiProperty({ description: 'Total duration in minutes' })
  @IsInt()
  @Min(1)
  totalDurationMinutes: number;

  @ApiPropertyOptional({ description: 'Subtotal in minor currency units', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  subtotalAmount?: number = 0;

  @ApiPropertyOptional({ description: 'Tax amount in minor currency units', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  taxAmount?: number = 0;

  @ApiPropertyOptional({ description: 'Discount amount in minor currency units', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  discountAmount?: number = 0;

  @ApiProperty({ description: 'Total amount in minor currency units' })
  @IsInt()
  @Min(0)
  totalAmount: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'INR' })
  @IsOptional()
  @IsString()
  currency?: string = 'INR';

  @ApiPropertyOptional({ description: 'Customer notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Salon internal notes' })
  @IsOptional()
  @IsString()
  internalNotes?: string;

  @ApiPropertyOptional({ description: 'Client IP address' })
  @IsOptional()
  @IsString()
  clientIp?: string;

  @ApiPropertyOptional({ description: 'Client User-Agent' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiProperty({ description: 'User ID creating this booking' })
  @IsUUID()
  createdByUserId: string;

  @ApiPropertyOptional({ type: [CreateBookingItemDto], description: 'Booking items' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBookingItemDto)
  items?: CreateBookingItemDto[];
}
