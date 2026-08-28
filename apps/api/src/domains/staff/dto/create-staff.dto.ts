import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StaffRole } from '@prisma/client';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateStaffDto {
  @ApiProperty({ description: 'ID of the salon', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  salonId: string;

  @ApiProperty({ description: 'Display name of staff member', example: 'Jane Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  displayName: string;

  @ApiProperty({ enum: StaffRole, default: StaffRole.STYLIST })
  @IsEnum(StaffRole)
  @IsNotEmpty()
  role: StaffRole;

  @ApiPropertyOptional({ description: 'Unique employee code within salon. Auto-generated if omitted.', example: 'EMP001' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  employeeCode?: string;

  @ApiPropertyOptional({ description: 'Optional bio or public description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({ description: 'Avatar media ID' })
  @IsOptional()
  @IsUUID()
  avatarMediaId?: string;

  @ApiPropertyOptional({ description: 'User ID if linking existing user' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Custom role ID for enterprise custom roles' })
  @IsOptional()
  @IsUUID()
  customRoleId?: string;

  @ApiPropertyOptional({ description: 'Joined date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  joinedAt?: string;
}
