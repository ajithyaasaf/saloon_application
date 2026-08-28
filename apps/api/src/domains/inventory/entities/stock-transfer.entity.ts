import { TransferStatus } from '@prisma/client';

export class StockTransferEntity {
  id: string;
  transferCode: string;
  salonId: string;
  sourceBranchId: string;
  destinationBranchId: string;
  status: TransferStatus;
  dispatchedByUserId?: string | null;
  dispatchedAt?: Date | null;
  receivedByUserId?: string | null;
  receivedAt?: Date | null;
  notes?: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  items?: StockTransferItemEntity[];

  constructor(partial: Partial<StockTransferEntity>) {
    Object.assign(this, partial);
  }

  public canBeDispatched(): boolean {
    return this.status === TransferStatus.DRAFT || this.status === TransferStatus.PENDING_DISPATCH;
  }

  public canBeReceived(): boolean {
    return this.status === TransferStatus.DISPATCHED || this.status === TransferStatus.PARTIALLY_RECEIVED;
  }

  public canBeCancelled(): boolean {
    return this.status === TransferStatus.DRAFT || this.status === TransferStatus.PENDING_DISPATCH;
  }
}

export class StockTransferItemEntity {
  id: string;
  stockTransferId: string;
  productVariantId: string;
  batchNumber: string;
  dispatchedQuantity: number;
  receivedQuantity: number;
  createdAt: Date;

  constructor(partial: Partial<StockTransferItemEntity>) {
    Object.assign(this, partial);
  }
}
