import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmploymentStatus, StaffRole } from '@prisma/client';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class StaffSummaryDto {
  @ApiProperty({ description: 'Staff ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Display name', example: 'Jane Doe' })
  @Expose()
  displayName: string;

  @ApiProperty({ description: 'Employee code', example: 'EMP001' })
  @Expose()
  employeeCode: string;

  @ApiProperty({ enum: StaffRole, example: StaffRole.STYLIST })
  @Expose()
  role: StaffRole;

  @ApiProperty({ enum: EmploymentStatus, example: EmploymentStatus.ACTIVE })
  @Expose()
  employmentStatus: EmploymentStatus;

  @ApiPropertyOptional({ description: 'Avatar media ID' })
  @Expose()
  avatarMediaId?: string;
}
