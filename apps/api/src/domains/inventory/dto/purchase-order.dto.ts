import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PurchaseOrderStatus, GRNStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

export class CreatePurchaseOrderItemDto {
  @ApiProperty()
  @IsUUID()
  productVariantId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  orderedQuantity: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  unitCostPrice: number;

  @ApiPropertyOptional()
  @IsOptional()
  taxRate?: number = 0.0;
}

export class CreatePurchaseOrderDto {
  @ApiProperty()
  @IsUUID()
  salonId: string;

  @ApiProperty()
  @IsUUID()
  branchId: string;

  @ApiProperty()
  @IsUUID()
  supplierId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedDeliveryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreatePurchaseOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items: CreatePurchaseOrderItemDto[];
}

export class UpdatePurchaseOrderDto {
  @ApiPropertyOptional({ enum: PurchaseOrderStatus })
  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedDeliveryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateGRNItemDto {
  @ApiProperty()
  @IsUUID()
  purchaseOrderItemId: string;

  @ApiProperty()
  @IsUUID()
  productVariantId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  receivedQuantity: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  acceptedQuantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  rejectedQuantity?: number = 0;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchNumber?: string = 'DEFAULT_BATCH';

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  manufactureDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  unitCostPrice: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class CreateGoodsReceivedNoteDto {
  @ApiProperty()
  @IsUUID()
  salonId: string;

  @ApiProperty()
  @IsUUID()
  branchId: string;

  @ApiProperty()
  @IsUUID()
  purchaseOrderId: string;

  @ApiProperty()
  @IsUUID()
  supplierId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  invoiceDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliveryChallanNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreateGRNItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGRNItemDto)
  items: CreateGRNItemDto[];
}

export class PurchaseOrderDto {
  @ApiProperty() id: string;
  @ApiProperty() poCode: string;
  @ApiProperty() salonId: string;
  @ApiProperty() branchId: string;
  @ApiProperty() supplierId: string;
  @ApiProperty() status: PurchaseOrderStatus;
  @ApiProperty() orderDate: Date;
  @ApiPropertyOptional() expectedDeliveryDate?: Date;
  @ApiProperty() subtotal: number;
  @ApiProperty() taxAmount: number;
  @ApiProperty() discountAmount: number;
  @ApiProperty() shippingAmount: number;
  @ApiProperty() totalAmount: number;
  @ApiPropertyOptional() notes?: string;
  @ApiPropertyOptional() approvedByUserId?: string;
  @ApiProperty() version: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class GoodsReceivedNoteDto {
  @ApiProperty() id: string;
  @ApiProperty() grnCode: string;
  @ApiProperty() salonId: string;
  @ApiProperty() branchId: string;
  @ApiProperty() purchaseOrderId: string;
  @ApiProperty() supplierId: string;
  @ApiProperty() status: GRNStatus;
  @ApiProperty() receivedDate: Date;
  @ApiProperty() receivedByUserId: string;
  @ApiPropertyOptional() invoiceNumber?: string;
  @ApiPropertyOptional() invoiceDate?: Date;
  @ApiPropertyOptional() deliveryChallanNumber?: string;
  @ApiProperty() totalAmount: number;
  @ApiPropertyOptional() notes?: string;
  @ApiProperty() version: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
