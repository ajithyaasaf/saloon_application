import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

/**
 * UpdateBranchServiceDto — Request body for updating branch service pricing and status.
 * Requires `version` for optimistic concurrency control.
 *
 * Architecture ref: Phase 11.0 & Phase 11.2
 */
export class UpdateBranchServiceDto {
  @ApiPropertyOptional({ example: 500.0, description: 'Updated price in INR' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 60, description: 'Updated duration in minutes (1 - 1440)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  durationMinutes?: number;

  @ApiPropertyOptional({ enum: ServiceStatus, description: 'Updated service status' })
  @IsOptional()
  @IsEnum(ServiceStatus)
  status?: ServiceStatus;

  @ApiPropertyOptional({ example: false, description: 'Updated active visibility flag' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: 1, description: 'Expected aggregate version for optimistic concurrency control' })
  @IsInt()
  @Min(1)
  version: number;
}
