import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransferStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

export class CreateStockTransferItemDto {
  @ApiProperty()
  @IsUUID()
  productVariantId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchNumber?: string = 'DEFAULT_BATCH';

  @ApiProperty()
  @IsInt()
  @Min(1)
  dispatchedQuantity: number;
}

export class CreateStockTransferDto {
  @ApiProperty()
  @IsUUID()
  salonId: string;

  @ApiProperty()
  @IsUUID()
  sourceBranchId: string;

  @ApiProperty()
  @IsUUID()
  destinationBranchId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreateStockTransferItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStockTransferItemDto)
  items: CreateStockTransferItemDto[];
}

export class StockTransferDto {
  @ApiProperty() id: string;
  @ApiProperty() transferCode: string;
  @ApiProperty() salonId: string;
  @ApiProperty() sourceBranchId: string;
  @ApiProperty() destinationBranchId: string;
  @ApiProperty() status: TransferStatus;
  @ApiPropertyOptional() dispatchedByUserId?: string;
  @ApiPropertyOptional() dispatchedAt?: Date;
  @ApiPropertyOptional() receivedByUserId?: string;
  @ApiPropertyOptional() receivedAt?: Date;
  @ApiPropertyOptional() notes?: string;
  @ApiProperty() version: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
