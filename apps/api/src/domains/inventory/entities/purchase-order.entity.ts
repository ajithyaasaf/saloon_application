import { GRNStatus, PurchaseOrderStatus } from '@prisma/client';

export class PurchaseOrderEntity {
  id: string;
  poCode: string;
  salonId: string;
  branchId: string;
  supplierId: string;
  status: PurchaseOrderStatus;
  orderDate: Date;
  expectedDeliveryDate?: Date | null;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  shippingAmount: number;
  totalAmount: number;
  notes?: string | null;
  approvedByUserId?: string | null;
  approvedAt?: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  items?: PurchaseOrderItemEntity[];

  constructor(partial: Partial<PurchaseOrderEntity>) {
    Object.assign(this, partial);
  }

  public canBeModified(): boolean {
    return this.status === PurchaseOrderStatus.DRAFT;
  }

  public canBeSubmitted(): boolean {
    return this.status === PurchaseOrderStatus.DRAFT;
  }

  public canBeApproved(): boolean {
    return this.status === PurchaseOrderStatus.SUBMITTED;
  }

  public canBeCancelled(): boolean {
    return (
      this.status === PurchaseOrderStatus.DRAFT ||
      this.status === PurchaseOrderStatus.SUBMITTED ||
      this.status === PurchaseOrderStatus.APPROVED
    );
  }

  public canReceiveGoods(): boolean {
    return (
      this.status === PurchaseOrderStatus.APPROVED ||
      this.status === PurchaseOrderStatus.PARTIAL_RECEIVED
    );
  }
}

export class PurchaseOrderItemEntity {
  id: string;
  purchaseOrderId: string;
  productVariantId: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unitCostPrice: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<PurchaseOrderItemEntity>) {
    Object.assign(this, partial);
  }

  public get pendingQuantity(): number {
    return Math.max(0, this.orderedQuantity - this.receivedQuantity);
  }
}

export class GoodsReceivedNoteEntity {
  id: string;
  grnCode: string;
  salonId: string;
  branchId: string;
  purchaseOrderId: string;
  supplierId: string;
  status: GRNStatus;
  receivedDate: Date;
  receivedByUserId: string;
  invoiceNumber?: string | null;
  invoiceDate?: Date | null;
  deliveryChallanNumber?: string | null;
  totalAmount: number;
  notes?: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  items?: GoodsReceivedItemEntity[];

  constructor(partial: Partial<GoodsReceivedNoteEntity>) {
    Object.assign(this, partial);
  }
}

export class GoodsReceivedItemEntity {
  id: string;
  grnId: string;
  purchaseOrderItemId: string;
  productVariantId: string;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  batchNumber: string;
  manufactureDate?: Date | null;
  expiryDate?: Date | null;
  unitCostPrice: number;
  rejectionReason?: string | null;
  createdAt: Date;

  constructor(partial: Partial<GoodsReceivedItemEntity>) {
    Object.assign(this, partial);
  }
}
