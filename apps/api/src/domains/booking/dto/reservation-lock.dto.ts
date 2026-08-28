import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class ReservationLockDto {
  @ApiProperty({ description: 'Reservation lock ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Unique lock key string', example: 'branch:123:staff:456:date:2026-08-08:slot:10:00' })
  @Expose()
  lockKey: string;

  @ApiProperty({ description: 'Branch ID' })
  @Expose()
  branchId: string;

  @ApiProperty({ description: 'Staff ID' })
  @Expose()
  staffId: string;

  @ApiProperty({ description: 'Customer ID' })
  @Expose()
  customerId: string;

  @ApiPropertyOptional({ description: 'Browser/Device checkout session ID' })
  @Expose()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Associated Booking ID if converted' })
  @Expose()
  bookingId?: string;

  @ApiProperty({ description: 'Start time UTC' })
  @Expose()
  startTime: Date;

  @ApiProperty({ description: 'End time UTC' })
  @Expose()
  endTime: Date;

  @ApiProperty({ description: 'Lock expiration timestamp UTC' })
  @Expose()
  expiresAt: Date;

  @ApiProperty({ description: 'Lock refresh count (max 1)', example: 0 })
  @Expose()
  refreshCount: number;

  @ApiProperty({ description: 'Whether lock has been released', example: false })
  @Expose()
  isReleased: boolean;

  @ApiProperty({ description: 'Lock creation timestamp' })
  @Expose()
  createdAt: Date;
}
