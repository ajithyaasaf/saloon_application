import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateReservationLockDto {
  @ApiProperty({ description: 'Unique lock key' })
  @IsString()
  lockKey: string;

  @ApiProperty({ description: 'Branch ID' })
  @IsUUID()
  branchId: string;

  @ApiProperty({ description: 'Staff ID' })
  @IsUUID()
  staffId: string;

  @ApiProperty({ description: 'Customer ID' })
  @IsUUID()
  customerId: string;

  @ApiPropertyOptional({ description: 'Browser/Device checkout session ID' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Associated Booking ID if created' })
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @ApiProperty({ description: 'Start time UTC' })
  @Type(() => Date)
  @IsDate()
  startTime: Date;

  @ApiProperty({ description: 'End time UTC' })
  @Type(() => Date)
  @IsDate()
  endTime: Date;

  @ApiProperty({ description: 'Lock expiration time UTC' })
  @Type(() => Date)
  @IsDate()
  expiresAt: Date;
}
