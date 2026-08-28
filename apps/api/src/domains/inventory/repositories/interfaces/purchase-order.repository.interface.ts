import { PurchaseOrder, PurchaseOrderItem, GoodsReceivedNote, GoodsReceivedItem } from '@prisma/client';
import { CreateGoodsReceivedNoteDto, CreatePurchaseOrderDto, UpdatePurchaseOrderDto } from '../../dto/purchase-order.dto';

export interface IPurchaseOrderRepository {
  findById(id: string): Promise<PurchaseOrder | null>;
  findByCode(poCode: string): Promise<PurchaseOrder | null>;
  findBySupplier(supplierId: string): Promise<PurchaseOrder[]>;
  findByBranch(branchId: string): Promise<PurchaseOrder[]>;
  search(salonId: string, branchId?: string, status?: string): Promise<{ data: PurchaseOrder[]; total: number }>;
  create(dto: CreatePurchaseOrderDto, poCode: string): Promise<PurchaseOrder>;
  update(id: string, dto: UpdatePurchaseOrderDto): Promise<PurchaseOrder>;
  softDelete(id: string): Promise<PurchaseOrder>;
}

export interface IPurchaseOrderItemRepository {
  findByPurchaseOrder(purchaseOrderId: string): Promise<PurchaseOrderItem[]>;
  updateReceivedQuantity(id: string, quantityDelta: number): Promise<PurchaseOrderItem>;
}

export interface IGoodsReceivedNoteRepository {
  findById(id: string): Promise<GoodsReceivedNote | null>;
  findByCode(grnCode: string): Promise<GoodsReceivedNote | null>;
  findByPurchaseOrder(purchaseOrderId: string): Promise<GoodsReceivedNote[]>;
  create(dto: CreateGoodsReceivedNoteDto, grnCode: string, userId: string): Promise<GoodsReceivedNote>;
}

export interface IGoodsReceivedItemRepository {
  findByGRN(grnId: string): Promise<GoodsReceivedItem[]>;
}
