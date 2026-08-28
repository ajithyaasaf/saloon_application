import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class AssignBranchDto {
  @ApiProperty({ description: 'ID of staff member', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  staffId: string;

  @ApiProperty({ description: 'ID of branch', example: '123e4567-e89b-12d3-a456-426614174001' })
  @IsUUID()
  @IsNotEmpty()
  branchId: string;

  @ApiPropertyOptional({ description: 'Set as primary branch assignment', default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ description: 'Assignment start date (YYYY-MM-DD)', example: '2026-08-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Assignment end date (YYYY-MM-DD)', example: '2027-08-01' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
