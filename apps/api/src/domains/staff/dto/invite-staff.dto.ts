import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StaffRole } from '@prisma/client';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class InviteStaffDto {
  @ApiProperty({ description: 'ID of the salon', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  salonId: string;

  @ApiPropertyOptional({ description: 'ID of existing staff profile if inviting existing record' })
  @IsOptional()
  @IsUUID()
  staffId?: string;

  @ApiProperty({ description: 'Display name of staff member', example: 'Jane Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  displayName: string;

  @ApiProperty({ enum: StaffRole, default: StaffRole.STYLIST })
  @IsEnum(StaffRole)
  @IsNotEmpty()
  role: StaffRole;

  @ApiPropertyOptional({ description: 'Email address to send invitation link', example: 'jane@example.com' })
  @IsOptional()
  @IsEmail()
  inviteEmail?: string;

  @ApiPropertyOptional({ description: 'Phone number to send invitation link', example: '+919876543210' })
  @IsOptional()
  @IsString()
  invitePhone?: string;

  @ApiPropertyOptional({ description: 'Unique employee code within salon. Auto-generated if omitted.', example: 'EMP001' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  employeeCode?: string;
}
