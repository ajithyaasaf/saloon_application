import { PurchaseOrderStatus, StockMovementType, StockTransferStatus } from '../../enums/index.js';

export interface ProductDto {
  id: string;
  salonId: string;
  name: string;
  sku: string;
  barcode?: string | null;
  description?: string | null;
  category?: string | null;
  brand?: string | null;
  unit: string;
  retailPrice: number;
  costPrice: number;
  isForRetail: boolean;
  isForProfessionalUse: boolean;
  imageUrl?: string | null;
  minStockAlertLevel: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BranchProductStockDto {
  id: string;
  branchId: string;
  productId: string;
  product?: ProductDto;
  quantityOnHand: number;
  quantityReserved: number;
  reorderLevel: number;
  reorderQuantity: number;
  isLowStock: boolean;
  lastRestockedAt?: string | null;
}

export interface StockMovementDto {
  id: string;
  branchId: string;
  productId: string;
  productName?: string;
  type: StockMovementType;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  reason?: string | null;
  referenceId?: string | null;
  performedByUserId: string;
  createdAt: string;
}

export interface SupplierDto {
  id: string;
  salonId: string;
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  gstin?: string | null;
  isActive: boolean;
}

export interface PurchaseOrderItemDto {
  id: string;
  productId: string;
  productName: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unitCost: number;
  totalCost: number;
}

export interface PurchaseOrderDto {
  id: string;
  poNumber: string;
  salonId: string;
  branchId: string;
  supplierId: string;
  supplierName?: string;
  status: PurchaseOrderStatus;
  totalAmount: number;
  items: PurchaseOrderItemDto[];
  orderedAt?: string | null;
  expectedDeliveryDate?: string | null;
  receivedAt?: string | null;
  createdAt: string;
}

export interface StockTransferItemDto {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
}

export interface StockTransferDto {
  id: string;
  transferNumber: string;
  fromBranchId: string;
  fromBranchName?: string;
  toBranchId: string;
  toBranchName?: string;
  status: StockTransferStatus;
  items: StockTransferItemDto[];
  notes?: string | null;
  initiatedAt: string;
  receivedAt?: string | null;
}

export type ProductStockDto = BranchProductStockDto;
