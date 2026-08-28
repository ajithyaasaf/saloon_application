import { StockMovementType } from '@prisma/client';

export class StockMovementEntity {
  id: string;
  movementCode: string;
  salonId: string;
  branchId: string;
  productVariantId: string;
  batchNumber: string;
  type: StockMovementType;
  quantity: number;
  unitCostPrice: number;
  totalValue: number;
  previousQuantity: number;
  newQuantity: number;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  actorUserId: string;
  createdAt: Date;

  constructor(partial: Partial<StockMovementEntity>) {
    Object.assign(this, partial);
  }
}
