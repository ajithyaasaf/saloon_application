import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateMembershipPlanDto {
  @ApiProperty({ description: 'Salon ID' })
  @IsUUID()
  salonId: string;

  @ApiProperty({ description: 'Plan Code' })
  @IsString()
  @IsNotEmpty()
  planCode: string;

  @ApiProperty({ description: 'Plan Name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Price in minor units' })
  @IsInt()
  @Min(0)
  price: number;

  @ApiProperty({ description: 'Validity in days' })
  @IsInt()
  @Min(1)
  validityDays: number;

  @ApiPropertyOptional({ description: 'Discount percentage on services', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @ApiPropertyOptional({ description: 'Benefits payload (free services, perks)' })
  @IsOptional()
  @IsObject()
  benefits?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Is active plan', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateMembershipPlanDto {
  @ApiProperty({ description: 'Expected version for optimistic concurrency control' })
  @IsInt()
  @Min(1)
  version: number;

  @ApiPropertyOptional({ description: 'Plan Name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Price in minor units' })
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'Validity in days' })
  @IsOptional()
  @IsInt()
  @Min(1)
  validityDays?: number;

  @ApiPropertyOptional({ description: 'Discount percentage' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @ApiPropertyOptional({ description: 'Benefits payload' })
  @IsOptional()
  @IsObject()
  benefits?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Is active plan' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@Exclude()
export class MembershipPlanDto {
  @Expose()
  @ApiProperty({ description: 'Plan ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Salon ID' })
  salonId: string;

  @Expose()
  @ApiProperty({ description: 'Plan Code' })
  planCode: string;

  @Expose()
  @ApiProperty({ description: 'Plan Name' })
  name: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Description' })
  description?: string;

  @Expose()
  @ApiProperty({ description: 'Price in minor units' })
  price: number;

  @Expose()
  @ApiProperty({ description: 'Validity in days' })
  validityDays: number;

  @Expose()
  @ApiProperty({ description: 'Discount percentage' })
  discountPercentage: number;

  @Expose()
  @ApiPropertyOptional({ description: 'Benefits payload' })
  benefits?: Record<string, any>;

  @Expose()
  @ApiProperty({ description: 'Is active' })
  isActive: boolean;

  @Expose()
  @ApiProperty({ description: 'Created At' })
  createdAt: Date;
}
