import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DayOfWeek } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class BreakIntervalDto {
  @ApiProperty({ description: 'Break start time (HH:MM)', example: '13:00' })
  @IsString()
  @IsNotEmpty()
  start: string;

  @ApiProperty({ description: 'Break end time (HH:MM)', example: '14:00' })
  @IsString()
  @IsNotEmpty()
  end: string;
}

export class UpdateWorkingHoursDto {
  @ApiProperty({ description: 'Expected version for optimistic locking', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  version: number;

  @ApiPropertyOptional({ enum: DayOfWeek })
  @IsOptional()
  @IsEnum(DayOfWeek)
  dayOfWeek?: DayOfWeek;

  @ApiPropertyOptional({ description: 'Shift start time (HH:MM or ISO time)', example: '09:00' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ description: 'Shift end time (HH:MM or ISO time)', example: '18:00' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Is shift active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Effective start date (YYYY-MM-DD)', example: '2026-08-01' })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional({ description: 'Effective end date (YYYY-MM-DD)', example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  effectiveUntil?: string;

  @ApiPropertyOptional({ type: [BreakIntervalDto], description: 'Optional list of break intervals' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BreakIntervalDto)
  breaks?: BreakIntervalDto[];
}
