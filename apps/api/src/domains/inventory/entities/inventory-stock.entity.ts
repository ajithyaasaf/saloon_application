import { AlertStatus, InventoryStatus } from '@prisma/client';

export class InventoryStockEntity {
  id: string;
  salonId: string;
  branchId: string;
  warehouseId?: string | null;
  productVariantId: string;
  batchNumber: string;
  expiryDate?: Date | null;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  quantityOnOrder: number;
  lastAuditDate?: Date | null;
  status: InventoryStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<InventoryStockEntity>) {
    Object.assign(this, partial);
  }

  public get calculatedAvailable(): number {
    return Math.max(0, this.quantityOnHand - this.quantityReserved);
  }

  public isLowStock(minThreshold: number): boolean {
    return this.quantityOnHand <= minThreshold;
  }
}

export class LowStockAlertEntity {
  id: string;
  salonId: string;
  branchId: string;
  productVariantId: string;
  currentQuantity: number;
  reorderPoint: number;
  alertStatus: AlertStatus;
  acknowledgedByUserId?: string | null;
  acknowledgedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<LowStockAlertEntity>) {
    Object.assign(this, partial);
  }

  public isActive(): boolean {
    return this.alertStatus === AlertStatus.ACTIVE;
  }
}
