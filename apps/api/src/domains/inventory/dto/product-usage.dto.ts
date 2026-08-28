import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductUsageType } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateProductUsageDto {
  @ApiProperty()
  @IsUUID()
  salonId: string;

  @ApiProperty()
  @IsUUID()
  branchId: string;

  @ApiProperty()
  @IsUUID()
  productVariantId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchNumber?: string = 'DEFAULT_BATCH';

  @ApiProperty({ enum: ProductUsageType })
  @IsEnum(ProductUsageType)
  usageType: ProductUsageType;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referenceType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referenceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  usedByStaffId?: string;
}

export class ProductUsageDto {
  @ApiProperty() id: string;
  @ApiProperty() usageCode: string;
  @ApiProperty() salonId: string;
  @ApiProperty() branchId: string;
  @ApiProperty() productVariantId: string;
  @ApiProperty() batchNumber: string;
  @ApiProperty() usageType: ProductUsageType;
  @ApiProperty() quantity: number;
  @ApiPropertyOptional() referenceType?: string;
  @ApiPropertyOptional() referenceId?: string;
  @ApiPropertyOptional() usedByStaffId?: string;
  @ApiProperty() usedAt: Date;
  @ApiProperty() version: number;
  @ApiProperty() createdAt: Date;
}
