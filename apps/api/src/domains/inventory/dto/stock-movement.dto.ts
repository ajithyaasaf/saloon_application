import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockMovementType } from '@prisma/client';

export class StockMovementDto {
  @ApiProperty() id: string;
  @ApiProperty() movementCode: string;
  @ApiProperty() salonId: string;
  @ApiProperty() branchId: string;
  @ApiProperty() productVariantId: string;
  @ApiProperty() batchNumber: string;
  @ApiProperty() type: StockMovementType;
  @ApiProperty() quantity: number;
  @ApiProperty() unitCostPrice: number;
  @ApiProperty() totalValue: number;
  @ApiProperty() previousQuantity: number;
  @ApiProperty() newQuantity: number;
  @ApiPropertyOptional() referenceType?: string;
  @ApiPropertyOptional() referenceId?: string;
  @ApiPropertyOptional() notes?: string;
  @ApiProperty() actorUserId: string;
  @ApiProperty() createdAt: Date;
}
