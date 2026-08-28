import { Injectable } from '@nestjs/common';
import { PurchaseOrder, PurchaseOrderItem, GoodsReceivedNote, GoodsReceivedItem } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CreateGoodsReceivedNoteDto, CreatePurchaseOrderDto, UpdatePurchaseOrderDto } from '../dto/purchase-order.dto';
import { IGoodsReceivedItemRepository, IGoodsReceivedNoteRepository, IPurchaseOrderItemRepository, IPurchaseOrderRepository } from './interfaces/purchase-order.repository.interface';

@Injectable()
export class PurchaseOrderRepository implements IPurchaseOrderRepository {
  constructor(private readonly db: PrismaService) { }

  public async findById(id: string): Promise<PurchaseOrder | null> {
    return this.db.purchaseOrder.findFirst({
      where: { id, deletedAt: null },
      include: { items: { include: { productVariant: true } }, supplier: true, branch: true },
    });
  }

  public async findByCode(poCode: string): Promise<PurchaseOrder | null> {
    return this.db.purchaseOrder.findFirst({
      where: { poCode, deletedAt: null },
      include: { items: true },
    });
  }

  public async findBySupplier(supplierId: string): Promise<PurchaseOrder[]> {
    return this.db.purchaseOrder.findMany({
      where: { supplierId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findByBranch(branchId: string): Promise<PurchaseOrder[]> {
    return this.db.purchaseOrder.findMany({
      where: { branchId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async search(salonId: string, branchId?: string, status?: any): Promise<{ data: PurchaseOrder[]; total: number }> {
    const where: any = { salonId, deletedAt: null };
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.db.purchaseOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { items: true, supplier: true },
      }),
      this.db.purchaseOrder.count({ where }),
    ]);

    return { data, total };
  }

  public async create(dto: CreatePurchaseOrderDto, poCode: string): Promise<PurchaseOrder> {
    let subtotal = 0;
    let totalTax = 0;
    const itemsData = dto.items.map((item) => {
      const lineSubtotal = item.orderedQuantity * item.unitCostPrice;
      const lineTax = Math.round((lineSubtotal * (item.taxRate ?? 0)) / 100);
      subtotal += lineSubtotal;
      totalTax += lineTax;
      return {
        productVariantId: item.productVariantId,
        orderedQuantity: item.orderedQuantity,
        unitCostPrice: item.unitCostPrice,
        taxRate: item.taxRate ?? 0,
        taxAmount: lineTax,
        totalAmount: lineSubtotal + lineTax,
      };
    });

    return this.db.purchaseOrder.create({
      data: {
        poCode,
        salonId: dto.salonId,
        branchId: dto.branchId,
        supplierId: dto.supplierId,
        expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : null,
        subtotal,
        taxAmount: totalTax,
        totalAmount: subtotal + totalTax,
        notes: dto.notes,
        items: {
          create: itemsData,
        },
      },
      include: { items: true },
    });
  }

  public async update(id: string, dto: UpdatePurchaseOrderDto): Promise<PurchaseOrder> {
    return this.db.purchaseOrder.update({
      where: { id },
      data: {
        ...dto,
        expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : undefined,
        version: { increment: 1 },
      },
      include: { items: true },
    });
  }

  public async softDelete(id: string): Promise<PurchaseOrder> {
    return this.db.purchaseOrder.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'CANCELLED' },
    });
  }
}

@Injectable()
export class PurchaseOrderItemRepository implements IPurchaseOrderItemRepository {
  constructor(private readonly db: PrismaService) { }

  public async findByPurchaseOrder(purchaseOrderId: string): Promise<PurchaseOrderItem[]> {
    return this.db.purchaseOrderItem.findMany({
      where: { purchaseOrderId },
    });
  }

  public async updateReceivedQuantity(id: string, quantityDelta: number): Promise<PurchaseOrderItem> {
    return this.db.purchaseOrderItem.update({
      where: { id },
      data: {
        receivedQuantity: { increment: quantityDelta },
      },
    });
  }
}

@Injectable()
export class GoodsReceivedNoteRepository implements IGoodsReceivedNoteRepository {
  constructor(private readonly db: PrismaService) { }

  public async findById(id: string): Promise<GoodsReceivedNote | null> {
    return this.db.goodsReceivedNote.findUnique({
      where: { id },
      include: { items: true },
    });
  }

  public async findByCode(grnCode: string): Promise<GoodsReceivedNote | null> {
    return this.db.goodsReceivedNote.findUnique({
      where: { grnCode },
      include: { items: true },
    });
  }

  public async findByPurchaseOrder(purchaseOrderId: string): Promise<GoodsReceivedNote[]> {
    return this.db.goodsReceivedNote.findMany({
      where: { purchaseOrderId },
      include: { items: true },
    });
  }

  public async create(dto: CreateGoodsReceivedNoteDto, grnCode: string, userId: string): Promise<GoodsReceivedNote> {
    let totalAmount = 0;
    const itemsData = dto.items.map((item) => {
      const itemTotal = item.acceptedQuantity * item.unitCostPrice;
      totalAmount += itemTotal;
      return {
        purchaseOrderItemId: item.purchaseOrderItemId,
        productVariantId: item.productVariantId,
        receivedQuantity: item.receivedQuantity,
        acceptedQuantity: item.acceptedQuantity,
        rejectedQuantity: item.rejectedQuantity ?? 0,
        batchNumber: item.batchNumber ?? 'DEFAULT_BATCH',
        manufactureDate: item.manufactureDate ? new Date(item.manufactureDate) : null,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
        unitCostPrice: item.unitCostPrice,
        rejectionReason: item.rejectionReason,
      };
    });

    return this.db.goodsReceivedNote.create({
      data: {
        grnCode,
        salonId: dto.salonId,
        branchId: dto.branchId,
        purchaseOrderId: dto.purchaseOrderId,
        supplierId: dto.supplierId,
        receivedByUserId: userId,
        invoiceNumber: dto.invoiceNumber,
        invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : null,
        deliveryChallanNumber: dto.deliveryChallanNumber,
        totalAmount,
        notes: dto.notes,
        items: {
          create: itemsData,
        },
      },
      include: { items: true },
    });
  }
}

@Injectable()
export class GoodsReceivedItemRepository implements IGoodsReceivedItemRepository {
  constructor(private readonly db: PrismaService) { }

  public async findByGRN(grnId: string): Promise<GoodsReceivedItem[]> {
    return this.db.goodsReceivedItem.findMany({
      where: { grnId },
    });
  }
}
