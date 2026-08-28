import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';

// ─── Product Events ─────────────────────────────────────────

export interface ProductCreatedPayload {
  productId: string;
  salonId: string;
  name: string;
  slug: string;
}

export class ProductCreatedEvent extends BaseDomainEvent<ProductCreatedPayload> {
  static readonly EVENT_NAME = 'product.created.v1';
  constructor(payload: ProductCreatedPayload, actorId?: string) {
    super(ProductCreatedEvent.EVENT_NAME, payload.productId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface ProductUpdatedPayload {
  productId: string;
  salonId: string;
  updatedFields: string[];
}

export class ProductUpdatedEvent extends BaseDomainEvent<ProductUpdatedPayload> {
  static readonly EVENT_NAME = 'product.updated.v1';
  constructor(payload: ProductUpdatedPayload, actorId?: string) {
    super(ProductUpdatedEvent.EVENT_NAME, payload.productId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface ProductArchivedPayload {
  productId: string;
  salonId: string;
}

export class ProductArchivedEvent extends BaseDomainEvent<ProductArchivedPayload> {
  static readonly EVENT_NAME = 'product.archived.v1';
  constructor(payload: ProductArchivedPayload, actorId?: string) {
    super(ProductArchivedEvent.EVENT_NAME, payload.productId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

// ─── Supplier Events ────────────────────────────────────────

export interface SupplierCreatedPayload {
  supplierId: string;
  salonId: string;
  code: string;
  name: string;
}

export class SupplierCreatedEvent extends BaseDomainEvent<SupplierCreatedPayload> {
  static readonly EVENT_NAME = 'supplier.created.v1';
  constructor(payload: SupplierCreatedPayload, actorId?: string) {
    super(SupplierCreatedEvent.EVENT_NAME, payload.supplierId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface SupplierUpdatedPayload {
  supplierId: string;
  salonId: string;
  updatedFields: string[];
}

export class SupplierUpdatedEvent extends BaseDomainEvent<SupplierUpdatedPayload> {
  static readonly EVENT_NAME = 'supplier.updated.v1';
  constructor(payload: SupplierUpdatedPayload, actorId?: string) {
    super(SupplierUpdatedEvent.EVENT_NAME, payload.supplierId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

// ─── Purchase Order Events ──────────────────────────────────

export interface PurchaseOrderCreatedPayload {
  purchaseOrderId: string;
  poCode: string;
  salonId: string;
  branchId: string;
  supplierId: string;
  totalAmount: number;
}

export class PurchaseOrderCreatedEvent extends BaseDomainEvent<PurchaseOrderCreatedPayload> {
  static readonly EVENT_NAME = 'purchase-order.created.v1';
  constructor(payload: PurchaseOrderCreatedPayload, actorId?: string) {
    super(PurchaseOrderCreatedEvent.EVENT_NAME, payload.purchaseOrderId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface PurchaseOrderSubmittedPayload {
  purchaseOrderId: string;
  salonId: string;
  branchId: string;
}

export class PurchaseOrderSubmittedEvent extends BaseDomainEvent<PurchaseOrderSubmittedPayload> {
  static readonly EVENT_NAME = 'purchase-order.submitted.v1';
  constructor(payload: PurchaseOrderSubmittedPayload, actorId?: string) {
    super(PurchaseOrderSubmittedEvent.EVENT_NAME, payload.purchaseOrderId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface PurchaseOrderApprovedPayload {
  purchaseOrderId: string;
  salonId: string;
  branchId: string;
  approvedByUserId: string;
}

export class PurchaseOrderApprovedEvent extends BaseDomainEvent<PurchaseOrderApprovedPayload> {
  static readonly EVENT_NAME = 'purchase-order.approved.v1';
  constructor(payload: PurchaseOrderApprovedPayload, actorId?: string) {
    super(PurchaseOrderApprovedEvent.EVENT_NAME, payload.purchaseOrderId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface PurchaseOrderCancelledPayload {
  purchaseOrderId: string;
  salonId: string;
  branchId: string;
  reason?: string;
}

export class PurchaseOrderCancelledEvent extends BaseDomainEvent<PurchaseOrderCancelledPayload> {
  static readonly EVENT_NAME = 'purchase-order.cancelled.v1';
  constructor(payload: PurchaseOrderCancelledPayload, actorId?: string) {
    super(PurchaseOrderCancelledEvent.EVENT_NAME, payload.purchaseOrderId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

// ─── Goods Received Note Events ─────────────────────────────

export interface GoodsReceivedCreatedPayload {
  grnId: string;
  grnCode: string;
  purchaseOrderId: string;
  salonId: string;
  branchId: string;
}

export class GoodsReceivedCreatedEvent extends BaseDomainEvent<GoodsReceivedCreatedPayload> {
  static readonly EVENT_NAME = 'goods-received.created.v1';
  constructor(payload: GoodsReceivedCreatedPayload, actorId?: string) {
    super(GoodsReceivedCreatedEvent.EVENT_NAME, payload.grnId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface GoodsReceivedVerifiedPayload {
  grnId: string;
  purchaseOrderId: string;
  salonId: string;
  branchId: string;
}

export class GoodsReceivedVerifiedEvent extends BaseDomainEvent<GoodsReceivedVerifiedPayload> {
  static readonly EVENT_NAME = 'goods-received.verified.v1';
  constructor(payload: GoodsReceivedVerifiedPayload, actorId?: string) {
    super(GoodsReceivedVerifiedEvent.EVENT_NAME, payload.grnId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

// ─── Inventory Stock Events ─────────────────────────────────

export interface StockIncreasedPayload {
  inventoryStockId: string;
  salonId: string;
  branchId: string;
  productVariantId: string;
  quantityDelta: number;
  newQuantityOnHand: number;
  reason: string;
}

export class StockIncreasedEvent extends BaseDomainEvent<StockIncreasedPayload> {
  static readonly EVENT_NAME = 'inventory.stock-increased.v1';
  constructor(payload: StockIncreasedPayload, actorId?: string) {
    super(StockIncreasedEvent.EVENT_NAME, payload.inventoryStockId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface StockDecreasedPayload {
  inventoryStockId: string;
  salonId: string;
  branchId: string;
  productVariantId: string;
  quantityDelta: number;
  newQuantityOnHand: number;
  reason: string;
}

export class StockDecreasedEvent extends BaseDomainEvent<StockDecreasedPayload> {
  static readonly EVENT_NAME = 'inventory.stock-decreased.v1';
  constructor(payload: StockDecreasedPayload, actorId?: string) {
    super(StockDecreasedEvent.EVENT_NAME, payload.inventoryStockId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface StockReservedPayload {
  inventoryStockId: string;
  branchId: string;
  productVariantId: string;
  quantity: number;
}

export class StockReservedEvent extends BaseDomainEvent<StockReservedPayload> {
  static readonly EVENT_NAME = 'inventory.stock-reserved.v1';
  constructor(payload: StockReservedPayload, actorId?: string) {
    super(StockReservedEvent.EVENT_NAME, payload.inventoryStockId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface StockReleasedPayload {
  inventoryStockId: string;
  branchId: string;
  productVariantId: string;
  quantity: number;
}

export class StockReleasedEvent extends BaseDomainEvent<StockReleasedPayload> {
  static readonly EVENT_NAME = 'inventory.stock-released.v1';
  constructor(payload: StockReleasedPayload, actorId?: string) {
    super(StockReleasedEvent.EVENT_NAME, payload.inventoryStockId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

// ─── Stock Transfer Events ──────────────────────────────────

export interface StockTransferCreatedPayload {
  transferId: string;
  transferCode: string;
  salonId: string;
  sourceBranchId: string;
  destinationBranchId: string;
}

export class StockTransferCreatedEvent extends BaseDomainEvent<StockTransferCreatedPayload> {
  static readonly EVENT_NAME = 'stock.transfer-created.v1';
  constructor(payload: StockTransferCreatedPayload, actorId?: string) {
    super(StockTransferCreatedEvent.EVENT_NAME, payload.transferId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface StockTransferDispatchedPayload {
  transferId: string;
  sourceBranchId: string;
  destinationBranchId: string;
  dispatchedByUserId: string;
}

export class StockTransferDispatchedEvent extends BaseDomainEvent<StockTransferDispatchedPayload> {
  static readonly EVENT_NAME = 'stock.transfer-dispatched.v1';
  constructor(payload: StockTransferDispatchedPayload, actorId?: string) {
    super(StockTransferDispatchedEvent.EVENT_NAME, payload.transferId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface StockTransferReceivedPayload {
  transferId: string;
  destinationBranchId: string;
  receivedByUserId: string;
}

export class StockTransferReceivedEvent extends BaseDomainEvent<StockTransferReceivedPayload> {
  static readonly EVENT_NAME = 'stock.transfer-received.v1';
  constructor(payload: StockTransferReceivedPayload, actorId?: string) {
    super(StockTransferReceivedEvent.EVENT_NAME, payload.transferId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

// ─── Stock Adjustment Events ────────────────────────────────

export interface StockAdjustmentApprovedPayload {
  adjustmentId: string;
  salonId: string;
  branchId: string;
  approvedByUserId: string;
}

export class StockAdjustmentApprovedEvent extends BaseDomainEvent<StockAdjustmentApprovedPayload> {
  static readonly EVENT_NAME = 'stock.adjustment-approved.v1';
  constructor(payload: StockAdjustmentApprovedPayload, actorId?: string) {
    super(StockAdjustmentApprovedEvent.EVENT_NAME, payload.adjustmentId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

export interface StockAdjustmentRejectedPayload {
  adjustmentId: string;
  salonId: string;
  branchId: string;
  rejectedByUserId: string;
}

export class StockAdjustmentRejectedEvent extends BaseDomainEvent<StockAdjustmentRejectedPayload> {
  static readonly EVENT_NAME = 'stock.adjustment-rejected.v1';
  constructor(payload: StockAdjustmentRejectedPayload, actorId?: string) {
    super(StockAdjustmentRejectedEvent.EVENT_NAME, payload.adjustmentId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

// ─── Stock Audit Events ─────────────────────────────────────

export interface StockAuditCompletedPayload {
  auditId: string;
  salonId: string;
  branchId: string;
  conductedByUserId: string;
}

export class StockAuditCompletedEvent extends BaseDomainEvent<StockAuditCompletedPayload> {
  static readonly EVENT_NAME = 'stock.audit-completed.v1';
  constructor(payload: StockAuditCompletedPayload, actorId?: string) {
    super(StockAuditCompletedEvent.EVENT_NAME, payload.auditId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

// ─── Product Usage Events ───────────────────────────────────

export interface ProductUsageRecordedPayload {
  usageId: string;
  salonId: string;
  branchId: string;
  productVariantId: string;
  quantity: number;
  usageType: string;
}

export class ProductUsageRecordedEvent extends BaseDomainEvent<ProductUsageRecordedPayload> {
  static readonly EVENT_NAME = 'product.usage-recorded.v1';
  constructor(payload: ProductUsageRecordedPayload, actorId?: string) {
    super(ProductUsageRecordedEvent.EVENT_NAME, payload.usageId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}

// ─── Low Stock Alert Events ─────────────────────────────────

export interface LowStockAlertPayload {
  alertId: string;
  salonId: string;
  branchId: string;
  productVariantId: string;
  currentQuantity: number;
  reorderPoint: number;
}

export class LowStockAlertEvent extends BaseDomainEvent<LowStockAlertPayload> {
  static readonly EVENT_NAME = 'inventory.low-stock.v1';
  constructor(payload: LowStockAlertPayload, actorId?: string) {
    super(LowStockAlertEvent.EVENT_NAME, payload.alertId, 1, payload, undefined, undefined, undefined, { actorId });
  }
}
