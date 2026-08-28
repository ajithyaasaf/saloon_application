import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuditStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';

export class CreateStockAuditItemDto {
  @ApiProperty()
  @IsUUID()
  productVariantId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchNumber?: string = 'DEFAULT_BATCH';

  @ApiProperty()
  @IsInt()
  expectedQuantity: number;

  @ApiProperty()
  @IsInt()
  countedQuantity: number;

  @ApiProperty()
  @IsInt()
  unitCostPrice: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateStockAuditDto {
  @ApiProperty()
  @IsUUID()
  salonId: string;

  @ApiProperty()
  @IsUUID()
  branchId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  auditType?: string = 'FULL';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreateStockAuditItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStockAuditItemDto)
  items: CreateStockAuditItemDto[];
}

export class StockAuditDto {
  @ApiProperty() id: string;
  @ApiProperty() auditCode: string;
  @ApiProperty() salonId: string;
  @ApiProperty() branchId: string;
  @ApiProperty() status: AuditStatus;
  @ApiProperty() auditType: string;
  @ApiProperty() auditDate: Date;
  @ApiProperty() conductedByUserId: string;
  @ApiPropertyOptional() approvedByUserId?: string;
  @ApiPropertyOptional() approvedAt?: Date;
  @ApiProperty() totalExpectedItems: number;
  @ApiProperty() totalDiscrepancyItems: number;
  @ApiProperty() netVarianceValue: number;
  @ApiPropertyOptional() notes?: string;
  @ApiProperty() version: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
