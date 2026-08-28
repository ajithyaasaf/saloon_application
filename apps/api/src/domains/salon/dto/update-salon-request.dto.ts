import { ApiPropertyOptional } from '@nestjs/swagger';
import { SalonPlanType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

/**
 * UpdateSalonRequestDto — HTTP Request DTO for updating an existing Salon.
 *
 * Architecture ref: Phase 10.0 & Phase 10.4
 */
export class UpdateSalonRequestDto {
  @ApiPropertyOptional({ example: 'Glamour Cuts Premium', description: 'Updated brand name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  brandName?: string;

  @ApiPropertyOptional({ example: 'Updated description', description: 'Updated description' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: '29ABCDE1234F1Z5', description: 'Updated GSTIN' })
  @IsOptional()
  @IsString()
  @MaxLength(15)
  gstin?: string;

  @ApiPropertyOptional({ enum: SalonPlanType, description: 'Updated plan type' })
  @IsOptional()
  @IsEnum(SalonPlanType)
  planType?: SalonPlanType;

  @ApiPropertyOptional({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'Updated logo media ID' })
  @IsOptional()
  @IsUUID()
  logoMediaId?: string;

  @ApiPropertyOptional({ example: 1, description: 'Expected aggregate version for optimistic concurrency' })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;
}
