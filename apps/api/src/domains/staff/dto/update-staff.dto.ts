import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmploymentStatus, StaffRole } from '@prisma/client';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateStaffDto {
  @ApiProperty({ description: 'Expected current version for optimistic concurrency control', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  version: number;

  @ApiPropertyOptional({ description: 'Display name of staff member', example: 'Jane Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional({ enum: StaffRole })
  @IsOptional()
  @IsEnum(StaffRole)
  role?: StaffRole;

  @ApiPropertyOptional({ enum: EmploymentStatus })
  @IsOptional()
  @IsEnum(EmploymentStatus)
  employmentStatus?: EmploymentStatus;

  @ApiPropertyOptional({ description: 'Optional bio or public description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({ description: 'Avatar media ID' })
  @IsOptional()
  @IsUUID()
  avatarMediaId?: string;

  @ApiPropertyOptional({ description: 'User ID if linking user' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Custom role ID' })
  @IsOptional()
  @IsUUID()
  customRoleId?: string;

  @ApiPropertyOptional({ description: 'Employee code' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  employeeCode?: string;

  @ApiPropertyOptional({ description: 'Joined date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  joinedAt?: string;
}
