import { AdjustmentReason } from '@prisma/client';

export class StockAdjustmentEntity {
  id: string;
  adjustmentCode: string;
  salonId: string;
  branchId: string;
  reason: AdjustmentReason;
  status: string;
  requestedByUserId: string;
  approvedByUserId?: string | null;
  approvedAt?: Date | null;
  notes?: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  items?: StockAdjustmentItemEntity[];

  constructor(partial: Partial<StockAdjustmentEntity>) {
    Object.assign(this, partial);
  }

  public isPending(): boolean {
    return this.status === 'PENDING_APPROVAL';
  }
}

export class StockAdjustmentItemEntity {
  id: string;
  stockAdjustmentId: string;
  productVariantId: string;
  batchNumber: string;
  systemQuantity: number;
  actualQuantity: number;
  adjustmentQuantity: number;
  unitCostPrice: number;
  totalVarianceValue: number;
  createdAt: Date;

  constructor(partial: Partial<StockAdjustmentItemEntity>) {
    Object.assign(this, partial);
  }
}
