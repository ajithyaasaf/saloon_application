import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmploymentStatus, StaffRole } from '@prisma/client';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class StaffDto {
  @ApiProperty({ description: 'Unique staff ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id: string;

  @ApiPropertyOptional({ description: 'Linked User ID', example: '123e4567-e89b-12d3-a456-426614174009' })
  @Expose()
  userId?: string;

  @ApiProperty({ description: 'Salon ID', example: '123e4567-e89b-12d3-a456-426614174001' })
  @Expose()
  salonId: string;

  @ApiProperty({ description: 'Employee code', example: 'EMP001' })
  @Expose()
  employeeCode: string;

  @ApiProperty({ description: 'Display name', example: 'Jane Doe' })
  @Expose()
  displayName: string;

  @ApiProperty({ enum: StaffRole, example: StaffRole.STYLIST })
  @Expose()
  role: StaffRole;

  @ApiPropertyOptional({ description: 'Custom role ID' })
  @Expose()
  customRoleId?: string;

  @ApiPropertyOptional({ description: 'Bio' })
  @Expose()
  bio?: string;

  @ApiPropertyOptional({ description: 'Avatar media ID' })
  @Expose()
  avatarMediaId?: string;

  @ApiProperty({ enum: EmploymentStatus, example: EmploymentStatus.ACTIVE })
  @Expose()
  employmentStatus: EmploymentStatus;

  @ApiPropertyOptional({ description: 'Invitation expiration date' })
  @Expose()
  invitationExpiresAt?: Date;

  @ApiPropertyOptional({ description: 'Employment start date' })
  @Expose()
  joinedAt?: Date;

  @ApiPropertyOptional({ description: 'Termination date' })
  @Expose()
  terminatedAt?: Date;

  @ApiProperty({ description: 'Creation timestamp' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @Expose()
  updatedAt: Date;
}
