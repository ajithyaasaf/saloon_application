import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from '@prisma/client';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class BookingStatusHistoryDto {
  @ApiProperty({ description: 'Status history ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Parent Booking ID', example: '123e4567-e89b-12d3-a456-426614174001' })
  @Expose()
  bookingId: string;

  @ApiPropertyOptional({ enum: BookingStatus, description: 'Previous status' })
  @Expose()
  fromStatus?: BookingStatus;

  @ApiProperty({ enum: BookingStatus, description: 'New status' })
  @Expose()
  toStatus: BookingStatus;

  @ApiPropertyOptional({ description: 'Reason for status transition' })
  @Expose()
  reason?: string;

  @ApiProperty({ description: 'User ID who performed transition' })
  @Expose()
  performedByUserId: string;

  @ApiProperty({ description: 'Actor role (CUSTOMER, STAFF, SALON_OWNER, ADMIN, SYSTEM)', example: 'CUSTOMER' })
  @Expose()
  actorRole: string;

  @ApiPropertyOptional({ description: 'Additional context metadata JSON' })
  @Expose()
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Transition timestamp' })
  @Expose()
  createdAt: Date;
}
