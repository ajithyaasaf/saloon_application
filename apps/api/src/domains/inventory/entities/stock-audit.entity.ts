import { AuditStatus } from '@prisma/client';

export class StockAuditEntity {
  id: string;
  auditCode: string;
  salonId: string;
  branchId: string;
  status: AuditStatus;
  auditType: string;
  auditDate: Date;
  conductedByUserId: string;
  approvedByUserId?: string | null;
  approvedAt?: Date | null;
  totalExpectedItems: number;
  totalDiscrepancyItems: number;
  netVarianceValue: number;
  notes?: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  items?: StockAuditItemEntity[];

  constructor(partial: Partial<StockAuditEntity>) {
    Object.assign(this, partial);
  }

  public isCompleted(): boolean {
    return this.status === AuditStatus.COMPLETED;
  }
}

export class StockAuditItemEntity {
  id: string;
  stockAuditId: string;
  productVariantId: string;
  batchNumber: string;
  expectedQuantity: number;
  countedQuantity: number;
  varianceQuantity: number;
  unitCostPrice: number;
  varianceValue: number;
  notes?: string | null;
  createdAt: Date;

  constructor(partial: Partial<StockAuditItemEntity>) {
    Object.assign(this, partial);
  }
}
