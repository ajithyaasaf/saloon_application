# PHASE 16 — INVENTORY & PRODUCT MANAGEMENT ARCHITECTURE BLUEPRINT

**Status**: FROZEN ARCHITECTURE SPECIFICATION  
**Module**: Phase 16 — Inventory & Product Management  
**Scope**: Multi-Tenant Salon ERP — Stock Control, Purchasing, Movements, Audits, Usage & Multi-Branch Inventory  
**Target Platform**: `@saloon/api` (NestJS / Prisma / PostgreSQL / Redis / BullMQ)

---

## 1. Executive Summary & Module Objective

The **Inventory & Product Management** module provides a production-grade enterprise stock control system for a multi-tenant salon booking & ERP platform. It manages the complete product lifecycle across retail items, professional stylist formulations, and salon consumables across single-branch and multi-branch operations.

### Key Functional Capabilities
1. **Product & Catalog Management**: Retail products, professional backbar formulations, and consumables; categorized with brand mappings, units of measure (UOM), and customizable variant matrices (size, color, volume).
2. **Supplier & Purchase Order Lifecycle**: Vendor directory, purchasing workflow (PO Creation $\rightarrow$ Approval $\rightarrow$ Goods Received Note $\rightarrow$ Partial/Full Receipt $\rightarrow$ Inventory Increment).
3. **Multi-Branch Inventory & Warehouse Support**: Branch-isolated stock levels, Safety Stock, Reorder Points, and inter-branch Stock Transfers (`StockTransfer`) with dispatch/receive verification.
4. **Immutable Double-Entry Stock Movement Ledger**: Every stock change (purchase, sale, service usage, damage, expiry, audit variance) writes an append-only `StockMovement` audit record.
5. **Product Usage & Service Consumption Integration**: Automatic backbar stock depletion upon appointment completion, manual usage logging, retail POS sales deduction, and waste tracking.
6. **Stock Audits & Variance Adjustments**: Blind/physical stock count audit sessions (`StockAudit`), discrepancy calculations, manager approvals, and automated ledger adjustments (`StockAdjustment`).
7. **Batch & FEFO Expiry Tracking**: Batch number tracking, manufacture/expiry dates, and First-Expiring-First-Out (FEFO) automated batch allocation for perishable cosmetics.
8. **Automated Low-Stock Alerts**: Real-time evaluation against reorder points and automated notification triggering.

---

## 2. Aggregate Roots & Domain Bounded Contexts

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                INVENTORY DOMAIN CONTEXT                                │
└────────────────────────────────────────────────────────────────────────────────────────┘

 [AGGREGATE 1: Product Catalog]
 ┌──────────────────────┐         ┌──────────────────────┐         ┌──────────────────────┐
 │       Product        │ ──1:N──>│    ProductVariant    │ ──N:1──>│    UnitOfMeasure     │
 └──────────────────────┘         └──────────────────────┘         └──────────────────────┘
            │                                 │
           N:1                               N:1
            ▼                                 ▼
 ┌──────────────────────┐         ┌──────────────────────┐
 │   ProductCategory    │         │        Brand         │
 └──────────────────────┘         └──────────────────────┘

 [AGGREGATE 2: Supplier & Purchasing]
 ┌──────────────────────┐         ┌──────────────────────┐         ┌──────────────────────┐
 │       Supplier       │ ──1:N──>│    PurchaseOrder     │ ──1:N──>│  GoodsReceivedNote   │
 └──────────────────────┘         └──────────────────────┘         └──────────────────────┘

 [AGGREGATE 3: Inventory Stock Balance]
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                                    InventoryStock                                      │
 │                     (branchId + productVariantId + batchNumber)                        │
 └────────────────────────────────────────────────────────────────────────────────────────┘

 [AGGREGATE 4: Stock Movement Ledger] (Immutable Double-Entry Audit Log)
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                                     StockMovement                                      │
 └────────────────────────────────────────────────────────────────────────────────────────┘

 [AGGREGATE 5: Inter-Branch Transfer]
 ┌──────────────────────┐         ┌──────────────────────┐
 │    StockTransfer     │ ──1:N──>│  StockTransferItem   │
 └──────────────────────┘         └──────────────────────┘

 [AGGREGATE 6: Audit & Adjustment]
 ┌──────────────────────┐         ┌──────────────────────┐         ┌──────────────────────┐
 │      StockAudit      │ ──1:N──>│    StockAuditItem    │ ────>   │   StockAdjustment    │
 └──────────────────────┘         └──────────────────────┘         └──────────────────────┘
```

### Aggregate Boundaries
1. **Product Aggregate**: `Product` is the root governing `ProductVariant`, `ProductCategory`, `Brand`, and `UnitOfMeasure`. Changes to product pricing, barcodes, or attributes route through `Product`.
2. **Supplier Aggregate**: `Supplier` governs `SupplierContact` and vendor-specific lead times and payment terms.
3. **PurchaseOrder Aggregate**: `PurchaseOrder` governs `PurchaseOrderItem`, `GoodsReceivedNote` (GRN), and `GoodsReceivedItem`.
4. **InventoryStock Aggregate**: `InventoryStock` tracks localized branch/warehouse physical balances, reserved quantities, and batch expiry dates.
5. **StockMovement Aggregate**: `StockMovement` is an immutable, append-only double-entry ledger record. No stock balance changes without a `StockMovement`.
6. **StockTransfer Aggregate**: `StockTransfer` governs inter-branch stock movements with dispatch/receipt state transitions.
7. **StockAudit Aggregate**: `StockAudit` governs physical inventory counts, variance calculations, and generated `StockAdjustment` requests.

---

## 3. Entity Specifications & Business Invariants

### 3.1 Product Aggregate Entities

#### `Product`
- `id`: UUID (PK)
- `salonId`: UUID (FK to Salon Tenant)
- `brandId`: UUID (FK to Brand, Optional)
- `categoryId`: UUID (FK to ProductCategory)
- `uomId`: UUID (FK to UnitOfMeasure)
- `name`: String (e.g., "L'Oréal Professionnel Serie Expert")
- `slug`: String
- `description`: Text
- `productType`: Enum (`RETAIL`, `PROFESSIONAL`, `CONSUMABLE`)
- `isActive`: Boolean
- `version`: Int (Optimistic Locking)
- `createdAt`, `updatedAt`, `deletedAt`: Timestamps

#### `ProductVariant`
- `id`: UUID (PK)
- `productId`: UUID (FK to Product)
- `sku`: String (Unique per tenant)
- `barcode`: String (EAN-13 / UPC / Internal, Indexed)
- `variantName`: String (e.g., "500ml", "Shade 7.1 Ash Blonde")
- `attributes`: JSON (Key-Value: `{ size: "500ml", color: "Ash Blonde" }`)
- `costPrice`: Int (in cents/paise)
- `retailPrice`: Int (in cents/paise)
- `professionalPrice`: Int (in cents/paise, for internal billing)
- `minStockLevel`: Int (Minimum threshold before warning)
- `reorderPoint`: Int (Stock level that triggers automated PO recommendation)
- `reorderQuantity`: Int (Standard reorder batch size)
- `weightGrams`: Int (Optional)
- `volumeMl`: Int (Optional)
- `isActive`: Boolean
- `version`: Int
- `createdAt`, `updatedAt`, `deletedAt`: Timestamps

#### `ProductCategory`
- `id`: UUID (PK)
- `salonId`: UUID
- `parentCategoryId`: UUID (Self-referential FK for subcategories)
- `name`: String
- `slug`: String
- `description`: Text
- `isActive`: Boolean
- `version`: Int
- `createdAt`, `updatedAt`, `deletedAt`: Timestamps

#### `Brand`
- `id`: UUID (PK)
- `salonId`: UUID
- `name`: String
- `logoUrl`: String
- `website`: String
- `isActive`: Boolean
- `version`: Int
- `createdAt`, `updatedAt`, `deletedAt`: Timestamps

#### `UnitOfMeasure`
- `id`: UUID (PK)
- `salonId`: UUID
- `name`: String (e.g., "Milliliter", "Gram", "Piece", "Bottle")
- `code`: String (e.g., `ML`, `GM`, `PCS`, `BTL`)
- `unitType`: Enum (`VOLUME`, `WEIGHT`, `COUNT`)
- `conversionFactor`: Float (Multiplier relative to base unit)
- `baseUnitId`: UUID (Optional self-referential FK)
- `createdAt`, `updatedAt`: Timestamps

---

### 3.2 Supplier & Purchasing Entities

#### `Supplier`
- `id`: UUID (PK)
- `salonId`: UUID
- `code`: String (Unique supplier code, e.g., `SUP-001`)
- `name`: String
- `taxId`: String (GSTIN / VAT ID)
- `paymentTerms`: String (e.g., "NET_30", "IMMEDIATE")
- `leadTimeDays`: Int (Default supplier fulfillment lead time)
- `status`: Enum (`ACTIVE`, `INACTIVE`, `BLOCKED`)
- `rating`: Float (Optional 1-5 vendor rating)
- `version`: Int
- `createdAt`, `updatedAt`, `deletedAt`: Timestamps

#### `SupplierContact`
- `id`: UUID (PK)
- `supplierId`: UUID (FK to Supplier)
- `contactName`: String
- `email`: String
- `phone`: String
- `designation`: String
- `isPrimary`: Boolean
- `createdAt`, `updatedAt`: Timestamps

#### `PurchaseOrder`
- `id`: UUID (PK)
- `poCode`: String (Formatted: `PO-{SALON_ID}-{YEAR}-{SEQ}`)
- `salonId`: UUID
- `branchId`: UUID
- `supplierId`: UUID
- `status`: Enum (`DRAFT`, `SUBMITTED`, `APPROVED`, `PARTIAL_RECEIVED`, `FULLY_RECEIVED`, `CANCELLED`, `REJECTED`)
- `orderDate`: Timestamp
- `expectedDeliveryDate`: Timestamp
- `subtotal`: Int
- `taxAmount`: Int
- `discountAmount`: Int
- `shippingAmount`: Int
- `totalAmount`: Int
- `notes`: Text
- `approvedByUserId`: UUID
- `version`: Int
- `createdAt`, `updatedAt`, `deletedAt`: Timestamps

#### `PurchaseOrderItem`
- `id`: UUID (PK)
- `purchaseOrderId`: UUID (FK to PurchaseOrder)
- `productVariantId`: UUID (FK to ProductVariant)
- `orderedQuantity`: Int
- `receivedQuantity`: Int (Cumulative quantity received across GRNs)
- `unitCostPrice`: Int
- `taxRate`: Float
- `taxAmount`: Int
- `totalAmount`: Int
- `createdAt`, `updatedAt`: Timestamps

#### `GoodsReceivedNote` (GRN)
- `id`: UUID (PK)
- `grnCode`: String (Formatted: `GRN-{SALON_ID}-{SEQ}`)
- `salonId`: UUID
- `branchId`: UUID
- `purchaseOrderId`: UUID (FK to PurchaseOrder)
- `supplierId`: UUID
- `status`: Enum (`DRAFT`, `RECEIVED`, `VERIFIED`, `REJECTED`)
- `receivedDate`: Timestamp
- `receivedByUserId`: UUID
- `invoiceNumber`: String
- `invoiceDate`: Timestamp
- `deliveryChallanNumber`: String
- `totalAmount`: Int
- `notes`: Text
- `version`: Int
- `createdAt`, `updatedAt`: Timestamps

#### `GoodsReceivedItem`
- `id`: UUID (PK)
- `grnId`: UUID (FK to GoodsReceivedNote)
- `purchaseOrderItemId`: UUID (FK to PurchaseOrderItem)
- `productVariantId`: UUID
- `receivedQuantity`: Int
- `acceptedQuantity`: Int
- `rejectedQuantity`: Int
- `batchNumber`: String
- `manufactureDate`: Timestamp
- `expiryDate`: Timestamp
- `unitCostPrice`: Int
- `rejectionReason`: String
- `createdAt`, `updatedAt`: Timestamps

---

### 3.3 Stock & Movement Entities

#### `InventoryStock`
- `id`: UUID (PK)
- `salonId`: UUID
- `branchId`: UUID
- `warehouseId`: UUID (Optional future ready)
- `productVariantId`: UUID (FK to ProductVariant)
- `batchNumber`: String (Default `DEFAULT_BATCH`)
- `expiryDate`: Timestamp (Optional)
- `quantityOnHand`: Int (Physical count on shelf)
- `quantityReserved`: Int (Held in active carts/orders)
- `quantityAvailable`: Int (Derived: `quantityOnHand - quantityReserved`)
- `quantityOnOrder`: Int (Ordered via pending POs)
- `lastAuditDate`: Timestamp
- `status`: Enum (`AVAILABLE`, `LOW_STOCK`, `OUT_OF_STOCK`, `EXPIRED`, `LOCKED`)
- `version`: Int (Optimistic Concurrency Lock)
- `createdAt`, `updatedAt`: Timestamps

#### `StockMovement` (Immutable Double-Entry Ledger)
- `id`: UUID (PK)
- `movementCode`: String (Formatted: `MOV-{SALON_ID}-{SEQ}`)
- `salonId`: UUID
- `branchId`: UUID
- `productVariantId`: UUID
- `batchNumber`: String
- `type`: Enum (`PURCHASE_RECEIPT`, `SALE`, `SERVICE_CONSUMPTION`, `TRANSFER_IN`, `TRANSFER_OUT`, `ADJUSTMENT_INCREASE`, `ADJUSTMENT_DECREASE`, `AUDIT_CORRECTION`, `DAMAGE_WRITE_OFF`, `EXPIRY_WRITE_OFF`, `INTERNAL_USE`, `RETURN_TO_SUPPLIER`)
- `quantity`: Int (Positive or Negative delta)
- `unitCostPrice`: Int
- `totalValue`: Int
- `previousQuantity`: Int
- `newQuantity`: Int
- `referenceType`: String (e.g., `PO`, `GRN`, `APPOINTMENT`, `POS_ORDER`, `TRANSFER`, `AUDIT`, `ADJUSTMENT`)
- `referenceId`: String
- `notes`: Text
- `actorUserId`: UUID
- `createdAt`: Timestamp

---

### 3.4 Transfer, Audit & Usage Entities

#### `StockTransfer`
- `id`: UUID (PK)
- `transferCode`: String (Formatted: `TRF-{SALON_ID}-{SEQ}`)
- `salonId`: UUID
- `sourceBranchId`: UUID
- `destinationBranchId`: UUID
- `status`: Enum (`DRAFT`, `PENDING_DISPATCH`, `DISPATCHED`, `PARTIALLY_RECEIVED`, `FULLY_RECEIVED`, `CANCELLED`)
- `dispatchedByUserId`: UUID
- `dispatchedAt`: Timestamp
- `receivedByUserId`: UUID
- `receivedAt`: Timestamp
- `notes`: Text
- `version`: Int
- `createdAt`, `updatedAt`: Timestamps

#### `StockTransferItem`
- `id`: UUID (PK)
- `stockTransferId`: UUID (FK to StockTransfer)
- `productVariantId`: UUID
- `batchNumber`: String
- `dispatchedQuantity`: Int
- `receivedQuantity`: Int
- `damagedQuantity`: Int
- `createdAt`, `updatedAt`: Timestamps

#### `StockAdjustment`
- `id`: UUID (PK)
- `adjustmentCode`: String (Formatted: `ADJ-{SALON_ID}-{SEQ}`)
- `salonId`: UUID
- `branchId`: UUID
- `reason`: Enum (`DAMAGE`, `SHRINKAGE_THEFT`, `EXPIRY`, `AUDIT_DISCREPANCY`, `DATA_ENTRY_ERROR`, `INTERNAL_SAMPLE`, `OTHER`)
- `status`: Enum (`PENDING_APPROVAL`, `APPROVED`, `REJECTED`)
- `requestedByUserId`: UUID
- `approvedByUserId`: UUID
- `approvedAt`: Timestamp
- `notes`: Text
- `version`: Int
- `createdAt`, `updatedAt`: Timestamps

#### `StockAdjustmentItem`
- `id`: UUID (PK)
- `stockAdjustmentId`: UUID (FK to StockAdjustment)
- `productVariantId`: UUID
- `batchNumber`: String
- `systemQuantity`: Int
- `actualQuantity`: Int
- `adjustmentQuantity`: Int (Delta)
- `unitCostPrice`: Int
- `totalVarianceValue`: Int
- `createdAt`, `updatedAt`: Timestamps

#### `StockAudit`
- `id`: UUID (PK)
- `auditCode`: String (Formatted: `AUD-{SALON_ID}-{SEQ}`)
- `salonId`: UUID
- `branchId`: UUID
- `status`: Enum (`PLANNED`, `IN_PROGRESS`, `UNDER_REVIEW`, `COMPLETED`, `CANCELLED`)
- `auditType`: Enum (`FULL`, `CATEGORY_SPECIFIC`, `SPOT_CHECK`)
- `auditDate`: Timestamp
- `conductedByUserId`: UUID
- `approvedByUserId`: UUID
- `approvedAt`: Timestamp
- `totalExpectedItems`: Int
- `totalDiscrepancyItems`: Int
- `netVarianceValue`: Int
- `notes`: Text
- `version`: Int
- `createdAt`, `updatedAt`: Timestamps

#### `StockAuditItem`
- `id`: UUID (PK)
- `stockAuditId`: UUID (FK to StockAudit)
- `productVariantId`: UUID
- `batchNumber`: String
- `expectedQuantity`: Int
- `countedQuantity`: Int
- `varianceQuantity`: Int
- `unitCostPrice`: Int
- `varianceValue`: Int
- `notes`: Text
- `createdAt`, `updatedAt`: Timestamps

#### `LowStockAlert`
- `id`: UUID (PK)
- `salonId`: UUID
- `branchId`: UUID
- `productVariantId`: UUID
- `currentQuantity`: Int
- `reorderPoint`: Int
- `alertStatus`: Enum (`ACTIVE`, `ACKNOWLEDGED`, `RESOLVED`)
- `acknowledgedByUserId`: UUID
- `acknowledgedAt`: Timestamp
- `createdAt`, `updatedAt`: Timestamps

#### `ProductUsage`
- `id`: UUID (PK)
- `usageCode`: String (Formatted: `USG-{SALON_ID}-{SEQ}`)
- `salonId`: UUID
- `branchId`: UUID
- `productVariantId`: UUID
- `batchNumber`: String
- `usageType`: Enum (`SERVICE_CONSUMPTION`, `RETAIL_SALE`, `MANUAL_INTERNAL`, `TESTER_SAMPLE`, `WASTE`, `DAMAGE`)
- `quantity`: Int
- `referenceType`: String (`APPOINTMENT`, `POS_ORDER`, `MANUAL`)
- `referenceId`: String
- `usedByStaffId`: UUID
- `usedAt`: Timestamp
- `version`: Int
- `createdAt`: Timestamp

---

## 4. Enums & Domain State Machines

### 4.1 Enums Definition
```typescript
export enum ProductType {
  RETAIL = 'RETAIL',
  PROFESSIONAL = 'PROFESSIONAL',
  CONSUMABLE = 'CONSUMABLE',
}

export enum InventoryStatus {
  AVAILABLE = 'AVAILABLE',
  LOW_STOCK = 'LOW_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  EXPIRED = 'EXPIRED',
  LOCKED = 'LOCKED',
}

export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  PARTIAL_RECEIVED = 'PARTIAL_RECEIVED',
  FULLY_RECEIVED = 'FULLY_RECEIVED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

export enum GRNStatus {
  DRAFT = 'DRAFT',
  RECEIVED = 'RECEIVED',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum StockMovementType {
  PURCHASE_RECEIPT = 'PURCHASE_RECEIPT',
  SALE = 'SALE',
  SERVICE_CONSUMPTION = 'SERVICE_CONSUMPTION',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
  ADJUSTMENT_INCREASE = 'ADJUSTMENT_INCREASE',
  ADJUSTMENT_DECREASE = 'ADJUSTMENT_DECREASE',
  AUDIT_CORRECTION = 'AUDIT_CORRECTION',
  DAMAGE_WRITE_OFF = 'DAMAGE_WRITE_OFF',
  EXPIRY_WRITE_OFF = 'EXPIRY_WRITE_OFF',
  INTERNAL_USE = 'INTERNAL_USE',
  RETURN_TO_SUPPLIER = 'RETURN_TO_SUPPLIER',
}

export enum TransferStatus {
  DRAFT = 'DRAFT',
  PENDING_DISPATCH = 'PENDING_DISPATCH',
  DISPATCHED = 'DISPATCHED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  FULLY_RECEIVED = 'FULLY_RECEIVED',
  CANCELLED = 'CANCELLED',
}

export enum AdjustmentReason {
  DAMAGE = 'DAMAGE',
  SHRINKAGE_THEFT = 'SHRINKAGE_THEFT',
  EXPIRY = 'EXPIRY',
  AUDIT_DISCREPANCY = 'AUDIT_DISCREPANCY',
  DATA_ENTRY_ERROR = 'DATA_ENTRY_ERROR',
  INTERNAL_SAMPLE = 'INTERNAL_SAMPLE',
  OTHER = 'OTHER',
}

export enum AuditStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  UNDER_REVIEW = 'UNDER_REVIEW',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ProductUsageType {
  SERVICE_CONSUMPTION = 'SERVICE_CONSUMPTION',
  RETAIL_SALE = 'RETAIL_SALE',
  MANUAL_INTERNAL = 'MANUAL_INTERNAL',
  TESTER_SAMPLE = 'TESTER_SAMPLE',
  WASTE = 'WASTE',
  DAMAGE = 'DAMAGE',
}

export enum UnitType {
  VOLUME = 'VOLUME',
  WEIGHT = 'WEIGHT',
  COUNT = 'COUNT',
}
```

---

## 5. Core Business Workflows & Execution Rules

### 5.1 Purchasing & Goods Receipt Flow
```
 ┌──────────────┐      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
 │ Create PO    │ ───> │ Approve PO   │ ───> │ Create GRN   │ ───> │ Accept Stock │
 │ (Status:     │      │ (Status:     │      │ (Physical    │      │ (Increment   │
 │ DRAFT)       │      │ APPROVED)    │      │ Receipt)     │      │ Balance)     │
 └──────────────┘      └──────────────┘      └──────────────┘      └──────────────┘
                                                                           │
                                                                           ▼
                                                                  ┌────────────────┐
                                                                  │ Log Ledger     │
                                                                  │ StockMovement  │
                                                                  │ PURCHASE_RCV   │
                                                                  └────────────────┘
```

1. **PO Creation**: Owner/Manager drafts PO for Supplier with target branch & line items.
2. **PO Approval**: Manager approves PO (`APPROVED`). PO status transitions from `DRAFT` $\rightarrow$ `APPROVED`.
3. **Physical Delivery & GRN Creation**: Upon package arrival, staff records `GoodsReceivedNote` (GRN) specifying actual accepted vs rejected quantities, batch numbers, and expiry dates.
4. **Over-Receiving Prevention**: `GoodsReceivedItem.acceptedQuantity` cannot exceed `PurchaseOrderItem.orderedQuantity - PurchaseOrderItem.receivedQuantity`.
5. **Inventory Update & Ledger Write**:
   - `InventoryStock.quantityOnHand` incremented for matching branch, variant, and batch.
   - Immutable `StockMovement` logged with type `PURCHASE_RECEIPT`.
   - `PurchaseOrderItem.receivedQuantity` updated.
   - If total received equals total ordered, PO marked `FULLY_RECEIVED`, otherwise `PARTIAL_RECEIVED`.

---

### 5.2 Product Usage & Service Consumption Flow
1. **Trigger**: Stylist completes appointment (Service Consumption) OR Customer purchases retail item (POS Sale).
2. **Batch Selection (FEFO / FIFO)**: System automatically selects batch with earliest expiry date (`FEFO`) with available stock (`quantityAvailable > 0`).
3. **Stock Reduction**:
   - `InventoryStock.quantityOnHand` decremented.
   - `ProductUsage` record created linking `appointmentId` or `posOrderId`.
   - `StockMovement` logged with type `SERVICE_CONSUMPTION` or `SALE`.
4. **Reorder & Alert Check**:
   - If `newQuantity <= variant.reorderPoint`, active `LowStockAlert` is created and `low-stock.detected.v1` event published.

---

### 5.3 Inter-Branch Stock Transfer Flow
1. **Transfer Request**: Source branch creates `StockTransfer` (`PENDING_DISPATCH`).
2. **Reservation & Dispatch**:
   - `InventoryStock.quantityReserved` incremented on source branch.
   - Source manager confirms dispatch $\rightarrow$ `InventoryStock.quantityOnHand` & `quantityReserved` decremented on source branch $\rightarrow$ `StockMovement` logged (`TRANSFER_OUT`).
   - Transfer marked `DISPATCHED`.
3. **Receipt at Destination**:
   - Destination branch receives shipment and verifies items.
   - `InventoryStock.quantityOnHand` incremented on destination branch $\rightarrow$ `StockMovement` logged (`TRANSFER_IN`).
   - Transfer marked `FULLY_RECEIVED`.

---

### 5.4 Physical Stock Audit & Variance Correction Flow
1. **Audit Initiation**: Manager creates `StockAudit` (`IN_PROGRESS`). Target variants locked from manual stock edits.
2. **Count Entry**: Auditor enters counted physical quantities into `StockAuditItem`.
3. **Variance Calculation**: `varianceQuantity = countedQuantity - expectedQuantity`.
4. **Review & Approval**: Manager reviews variance value. Upon approval:
   - System creates `StockAdjustment` with reason `AUDIT_DISCREPANCY`.
   - `StockMovement` logged with type `AUDIT_CORRECTION`.
   - `InventoryStock.quantityOnHand` adjusted to match `countedQuantity`.
   - `StockAudit` status marked `COMPLETED`.

---

## 6. Inventory Rules & Safeguards

1. **Negative Stock Prevention**: Database check constraint `CHECK (quantity_on_hand >= 0)` and domain validation throwing `ConflictException` if a deduction would result in negative balance.
2. **Optimistic Concurrency Control**: All stock mutations enforce `@version` checks on `InventoryStock` to prevent race conditions during simultaneous POS checkout or multi-terminal usages.
3. **Branch Isolation**: All inventory queries and updates strictly scoped to `(salonId, branchId)`. Cross-branch data leakage strictly prohibited.
4. **Double-Entry Balance Reconciliation**:
   $$\text{Current Stock Balance} = \sum (\text{StockMovement.quantity})$$
   Nightly reconciliation job verifies `InventoryStock.quantityOnHand` against total ledger delta.

---

## 7. Folder Structure

```
apps/api/src/domains/inventory/
├── controllers/
│   ├── inventory-public.controller.ts
│   ├── inventory-customer.controller.ts
│   ├── inventory-owner.controller.ts
│   ├── inventory-admin.controller.ts
│   └── tests/
│       ├── inventory-public.controller.spec.ts
│       ├── inventory-customer.controller.spec.ts
│       ├── inventory-owner.controller.spec.ts
│       └── inventory-admin.controller.spec.ts
├── services/
│   ├── product.service.ts
│   ├── supplier.service.ts
│   ├── purchase-order.service.ts
│   ├── inventory-stock.service.ts
│   ├── stock-movement.service.ts
│   ├── stock-transfer.service.ts
│   ├── stock-audit.service.ts
│   ├── product-usage.service.ts
│   └── tests/
│       ├── product.service.spec.ts
│       ├── purchase-order.service.spec.ts
│       └── inventory-stock.service.spec.ts
├── repositories/
│   ├── interfaces/
│   │   ├── product.repository.interface.ts
│   │   ├── supplier.repository.interface.ts
│   │   ├── purchase-order.repository.interface.ts
│   │   ├── inventory-stock.repository.interface.ts
│   │   ├── stock-movement.repository.interface.ts
│   │   ├── stock-transfer.repository.interface.ts
│   │   └── stock-audit.repository.interface.ts
│   ├── product.repository.ts
│   ├── product-variant.repository.ts
│   ├── supplier.repository.ts
│   ├── purchase-order.repository.ts
│   ├── goods-received-note.repository.ts
│   ├── inventory-stock.repository.ts
│   ├── stock-movement.repository.ts
│   ├── stock-transfer.repository.ts
│   ├── stock-adjustment.repository.ts
│   ├── stock-audit.repository.ts
│   ├── product-usage.repository.ts
│   └── tests/
│       ├── product.repository.spec.ts
│       └── inventory-stock.repository.spec.ts
├── entities/
│   ├── product.entity.ts
│   ├── product-variant.entity.ts
│   ├── supplier.entity.ts
│   ├── purchase-order.entity.ts
│   ├── goods-received-note.entity.ts
│   ├── inventory-stock.entity.ts
│   ├── stock-movement.entity.ts
│   ├── stock-transfer.entity.ts
│   ├── stock-audit.entity.ts
│   └── product-usage.entity.ts
├── dto/
│   ├── create-product.dto.ts
│   ├── update-product.dto.ts
│   ├── create-product-variant.dto.ts
│   ├── create-supplier.dto.ts
│   ├── create-purchase-order.dto.ts
│   ├── create-grn.dto.ts
│   ├── create-stock-transfer.dto.ts
│   ├── create-stock-audit.dto.ts
│   ├── create-stock-adjustment.dto.ts
│   ├── record-product-usage.dto.ts
│   └── search-inventory-query.dto.ts
├── events/
│   └── inventory-events.event.ts
├── interfaces/
│   └── inventory-provider.interface.ts
└── inventory.module.ts
```

---

## 8. REST Controllers & Endpoint Routes

### 8.1 Public Routes (`/api/v1/inventory/public`) — `@Public()`
- `GET /products` $\rightarrow$ Search public retail product catalog (Paginated)
- `GET /products/:id` $\rightarrow$ Get product details and variants
- `GET /categories` $\rightarrow$ Get active product category hierarchy
- `GET /brands` $\rightarrow$ Get brand listing

### 8.2 Customer Routes (`/api/v1/customer/inventory`) — `@Roles(UserRole.CUSTOMER)`
- `GET /retail-products` $\rightarrow$ Browse available retail add-on products for booking

### 8.3 Salon Owner & Manager Routes (`/api/v1/owner/inventory`) — `@Roles(UserRole.SALON_OWNER)`

#### Product & Catalog Management
- `POST /products` $\rightarrow$ Create product & variants
- `GET /products` $\rightarrow$ Search salon products (Paginated)
- `GET /products/:id` $\rightarrow$ Get full product detail
- `PATCH /products/:id` $\rightarrow$ Update product
- `DELETE /products/:id` $\rightarrow$ Archive product
- `POST /categories` $\rightarrow$ Create category
- `PATCH /categories/:id` $\rightarrow$ Update category
- `POST /brands` $\rightarrow$ Create brand
- `PATCH /brands/:id` $\rightarrow$ Update brand

#### Suppliers & Purchasing
- `POST /suppliers` $\rightarrow$ Create supplier profile
- `GET /suppliers` $\rightarrow$ List suppliers
- `PATCH /suppliers/:id` $\rightarrow$ Update supplier
- `POST /purchase-orders` $\rightarrow$ Create draft Purchase Order
- `GET /purchase-orders` $\rightarrow$ List purchase orders
- `POST /purchase-orders/:id/approve` $\rightarrow$ Approve PO
- `POST /purchase-orders/:id/cancel` $\rightarrow$ Cancel PO
- `POST /grn` $\rightarrow$ Receive Goods Received Note (GRN) & update stock

#### Stock Balances & Movements
- `GET /stock` $\rightarrow$ Get current branch inventory balances (Paginated)
- `GET /stock/movements` $\rightarrow$ Get immutable stock movement audit ledger
- `POST /usage` $\rightarrow$ Record manual/service product usage

#### Stock Transfers
- `POST /transfers` $\rightarrow$ Create inter-branch stock transfer request
- `GET /transfers` $\rightarrow$ List stock transfers
- `POST /transfers/:id/dispatch` $\rightarrow$ Dispatch stock transfer
- `POST /transfers/:id/receive` $\rightarrow$ Receive stock transfer

#### Audits & Adjustments
- `POST /audits` $\rightarrow$ Initiate stock audit session
- `POST /audits/:id/count` $\rightarrow$ Save counted quantities
- `POST /audits/:id/complete` $\rightarrow$ Approve audit & apply adjustments
- `POST /adjustments` $\rightarrow$ Create manual stock adjustment request
- `POST /adjustments/:id/approve` $\rightarrow$ Approve stock adjustment

#### Low Stock Alerts
- `GET /alerts` $\rightarrow$ List active low stock alerts
- `POST /alerts/:id/acknowledge` $\rightarrow$ Acknowledge low stock alert

### 8.4 Super Admin Routes (`/api/v1/admin/inventory`) — `@Roles(UserRole.SUPER_ADMIN)`
- `GET /statistics` $\rightarrow$ Get global platform inventory valuation & stock health
- `GET /movements` $\rightarrow$ Search global stock movement audit trail across all tenants

---

## 9. Shared Services Integration & Responsibilities

1. **`TransactionService.run()`**: Wraps multi-table writes (GRN receipt, stock transfer dispatch, audit adjustment) in explicit database transactions.
2. **`AuditService.logInTransaction()`**: Appends audit logs for PO approvals, adjustments, and supplier changes inside active database transactions.
3. **`CacheService`**: Manages cache-aside strategy for product catalogs, categories, and branch stock balances.
4. **`EventBusService.publish()`**: Emits strongly-typed domain events strictly after transaction commit.
5. **`QueueService`**: Dispatches asynchronous background jobs for low-stock alert notifications and nightly stock balance reconciliation.
6. **`NotificationService`**: Sends low-stock SMS/Email notifications to salon managers.

---

## 10. Cache Architecture

| Cache Key Namespace | Strategy | TTL (Seconds) | Invalidation Trigger |
| :--- | :--- | :---: | :--- |
| `PRODUCT_CATALOG` | Cache-Aside | 3600 (1 hr) | `createProduct`, `updateProduct`, `archiveProduct` |
| `PRODUCT_CATEGORIES` | Cache-Aside | 86400 (24 hr) | `createCategory`, `updateCategory` |
| `PRODUCT_BRANDS` | Cache-Aside | 86400 (24 hr) | `createBrand`, `updateBrand` |
| `INVENTORY_STOCK` | Cache-Aside | 300 (5 min) | `receiveGRN`, `recordUsage`, `adjustStock`, `receiveTransfer` |
| `LOW_STOCK_ALERTS` | Cache-Aside | 600 (10 min) | `acknowledgeAlert`, `receiveGRN` |
| `SUPPLIER_DIRECTORY` | Cache-Aside | 3600 (1 hr) | `createSupplier`, `updateSupplier` |

---

## 11. Domain Events Specifications

1. `product.created.v1`: Published when new product or variant is created.
2. `product.updated.v1`: Published when pricing or attributes change.
3. `purchase-order.created.v1`: Published when PO is submitted for approval.
4. `grn.received.v1`: Published when physical goods are accepted into inventory.
5. `inventory.updated.v1`: Published whenever `quantityOnHand` is modified.
6. `stock.transferred.v1`: Published when inter-branch transfer is completed.
7. `stock.adjusted.v1`: Published when manual stock adjustment or audit correction is approved.
8. `stock.audit.completed.v1`: Published when physical inventory count audit session completes.
9. `low-stock.detected.v1`: Published when stock level drops below reorder point.

---

## 12. Security & Database Design

### Security Safeguards
- **Role-Based Access Control (RBAC)**: Strict role guards on endpoints (`SALON_OWNER`, `SUPER_ADMIN`).
- **Tenant & Branch Isolation**: All queries enforce `WHERE salon_id = :salonId AND branch_id = :branchId`.
- **Audit & Protection**: Immutable `StockMovement` table prevents manual deletion or modification of movement records.

### Database Indexing & Constraints
- `idx_product_variant_sku`: Unique index on `(salon_id, sku)`.
- `idx_product_variant_barcode`: B-Tree index on `(salon_id, barcode)`.
- `idx_inventory_stock_lookup`: Composite index on `(salon_id, branch_id, product_variant_id, batch_number)`.
- `idx_stock_movement_ref`: Composite index on `(salon_id, branch_id, reference_type, reference_id)`.
- `chk_inventory_stock_non_negative`: Database CHECK constraint `CHECK (quantity_on_hand >= 0)`.

---

## 13. Transaction Execution Rules

Strict execution sequence enforced for all stock mutations:

$$\text{Database Transaction} \longrightarrow \text{Audit Log} \longrightarrow \text{Commit} \longrightarrow \text{Cache Invalidation} \longrightarrow \text{Domain Events} \longrightarrow \text{Queue/Notifications}$$

1. **Open Database Transaction** via `TransactionService.run()`.
2. **Execute Invariant Validation** (Check non-negative stock, verify PO status).
3. **Mutate Inventory Records** (`InventoryStock` update + `StockMovement` insert).
4. **Write Transaction Audit Log** via `AuditService.logInTransaction()`.
5. **Commit Database Transaction**.
6. **Evict Affected Redis Caches** (`CacheService.delete()`).
7. **Publish Domain Events** via `EventBusService.publish()`.
8. **Dispatch Asynchronous Queue Jobs** (Low-stock notifications, webhooks).

---

Phase 16.0 Inventory & Product Management Architecture is complete and ready for review.
