import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdjustmentReason } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';

export class CreateStockAdjustmentItemDto {
  @ApiProperty()
  @IsUUID()
  productVariantId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchNumber?: string = 'DEFAULT_BATCH';

  @ApiProperty()
  @IsInt()
  systemQuantity: number;

  @ApiProperty()
  @IsInt()
  actualQuantity: number;

  @ApiProperty()
  @IsInt()
  unitCostPrice: number;
}

export class CreateStockAdjustmentDto {
  @ApiProperty()
  @IsUUID()
  salonId: string;

  @ApiProperty()
  @IsUUID()
  branchId: string;

  @ApiProperty({ enum: AdjustmentReason })
  @IsEnum(AdjustmentReason)
  reason: AdjustmentReason;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreateStockAdjustmentItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStockAdjustmentItemDto)
  items: CreateStockAdjustmentItemDto[];
}

export class StockAdjustmentDto {
  @ApiProperty() id: string;
  @ApiProperty() adjustmentCode: string;
  @ApiProperty() salonId: string;
  @ApiProperty() branchId: string;
  @ApiProperty() reason: AdjustmentReason;
  @ApiProperty() status: string;
  @ApiProperty() requestedByUserId: string;
  @ApiPropertyOptional() approvedByUserId?: string;
  @ApiPropertyOptional() approvedAt?: Date;
  @ApiPropertyOptional() notes?: string;
  @ApiProperty() version: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
