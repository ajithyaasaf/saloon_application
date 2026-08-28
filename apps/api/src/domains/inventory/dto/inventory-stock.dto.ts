import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InventoryStatus, AlertStatus } from '@prisma/client';

export class InventoryStockDto {
  @ApiProperty() id: string;
  @ApiProperty() salonId: string;
  @ApiProperty() branchId: string;
  @ApiPropertyOptional() warehouseId?: string;
  @ApiProperty() productVariantId: string;
  @ApiProperty() batchNumber: string;
  @ApiPropertyOptional() expiryDate?: Date;
  @ApiProperty() quantityOnHand: number;
  @ApiProperty() quantityReserved: number;
  @ApiProperty() quantityAvailable: number;
  @ApiProperty() quantityOnOrder: number;
  @ApiPropertyOptional() lastAuditDate?: Date;
  @ApiProperty() status: InventoryStatus;
  @ApiProperty() version: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class PaginatedInventoryDto {
  @ApiProperty({ type: [InventoryStockDto] }) data: InventoryStockDto[];
  @ApiProperty() meta: { total: number; page: number; limit: number; totalPages: number; hasNextPage: boolean; hasPrevPage: boolean };
}

export class LowStockAlertDto {
  @ApiProperty() id: string;
  @ApiProperty() salonId: string;
  @ApiProperty() branchId: string;
  @ApiProperty() productVariantId: string;
  @ApiProperty() currentQuantity: number;
  @ApiProperty() reorderPoint: number;
  @ApiProperty() alertStatus: AlertStatus;
  @ApiPropertyOptional() acknowledgedByUserId?: string;
  @ApiPropertyOptional() acknowledgedAt?: Date;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
