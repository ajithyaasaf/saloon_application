import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';

/**
 * CreateBranchServiceDto — Request body for activating a service at a specific branch.
 *
 * Architecture ref: Phase 11.0 & Phase 11.2
 */
export class CreateBranchServiceDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'Branch ID' })
  @IsUUID()
  branchId: string;

  @ApiProperty({ example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', description: 'Master Service ID' })
  @IsUUID()
  serviceId: string;

  @ApiProperty({ example: 450.0, description: 'Service price in INR' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @ApiProperty({ example: 45, description: 'Duration in minutes (1 - 1440)' })
  @IsInt()
  @Min(1)
  @Max(1440)
  durationMinutes: number;

  @ApiPropertyOptional({ enum: ServiceStatus, default: ServiceStatus.ACTIVE, description: 'Service status' })
  @IsOptional()
  @IsEnum(ServiceStatus)
  status?: ServiceStatus;

  @ApiPropertyOptional({ example: true, default: true, description: 'Active visibility flag' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
