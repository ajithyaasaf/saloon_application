import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HalfDayPeriod, LeaveType } from '@prisma/client';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateLeaveDto {
  @ApiProperty({ description: 'ID of staff member', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  staffId: string;

  @ApiProperty({ enum: LeaveType, default: LeaveType.CASUAL })
  @IsEnum(LeaveType)
  @IsNotEmpty()
  leaveType: LeaveType;

  @ApiProperty({ description: 'Leave start date (YYYY-MM-DD)', example: '2026-08-10' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ description: 'Leave end date (YYYY-MM-DD)', example: '2026-08-12' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiPropertyOptional({ enum: HalfDayPeriod, description: 'Period for half-day leave' })
  @IsOptional()
  @IsEnum(HalfDayPeriod)
  halfDayPeriod?: HalfDayPeriod;

  @ApiPropertyOptional({ description: 'Reason for leave request' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
