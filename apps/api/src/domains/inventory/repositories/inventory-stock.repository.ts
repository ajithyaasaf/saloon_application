import { Injectable } from '@nestjs/common';
import { InventoryStock, LowStockAlert, InventoryStatus, AlertStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { SearchInventoryQueryDto } from '../dto/search-inventory.dto';
import { IInventoryStockRepository, ILowStockAlertRepository } from './interfaces/inventory-stock.repository.interface';

@Injectable()
export class InventoryStockRepository implements IInventoryStockRepository {
  constructor(private readonly db: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<InventoryStock | null> {
    const client = tx ?? this.db;
    return client.inventoryStock.findUnique({
      where: { id },
      include: { productVariant: true },
    });
  }

  public async findByVariant(
    branchId: string,
    productVariantId: string,
    batchNumber: string = 'DEFAULT_BATCH',
    tx?: PrismaTransaction,
  ): Promise<InventoryStock | null> {
    const client = tx ?? this.db;
    return client.inventoryStock.findUnique({
      where: {
        branchId_productVariantId_batchNumber: {
          branchId,
          productVariantId,
          batchNumber,
        },
      },
      include: { productVariant: true },
    });
  }

  public async findByBranch(branchId: string, tx?: PrismaTransaction): Promise<InventoryStock[]> {
    const client = tx ?? this.db;
    return client.inventoryStock.findMany({
      where: { branchId },
      include: { productVariant: true },
    });
  }

  public async findByBatch(productVariantId: string, batchNumber: string, tx?: PrismaTransaction): Promise<InventoryStock[]> {
    const client = tx ?? this.db;
    return client.inventoryStock.findMany({
      where: { productVariantId, batchNumber },
    });
  }

  public async findLowStock(branchId: string, tx?: PrismaTransaction): Promise<InventoryStock[]> {
    const client = tx ?? this.db;
    return client.inventoryStock.findMany({
      where: { branchId, status: InventoryStatus.LOW_STOCK },
      include: { productVariant: true },
    });
  }

  public async findExpiring(branchId: string, thresholdDate: Date, tx?: PrismaTransaction): Promise<InventoryStock[]> {
    const client = tx ?? this.db;
    return client.inventoryStock.findMany({
      where: {
        branchId,
        expiryDate: { lte: thresholdDate },
        quantityOnHand: { gt: 0 },
      },
      include: { productVariant: true },
    });
  }

  public async search(query: SearchInventoryQueryDto, tx?: PrismaTransaction): Promise<{ data: InventoryStock[]; total: number }> {
    const client = tx ?? this.db;
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.salonId) where.salonId = query.salonId;
    if (query.branchId) where.branchId = query.branchId;
    if (query.productVariantId) where.productVariantId = query.productVariantId;
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      client.inventoryStock.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: { productVariant: true },
      }),
      client.inventoryStock.count({ where }),
    ]);

    return { data, total };
  }

  public async reserve(id: string, quantity: number, currentVersion: number, tx?: PrismaTransaction): Promise<InventoryStock> {
    const client = tx ?? this.db;
    return client.inventoryStock.update({
      where: { id, version: currentVersion },
      data: {
        quantityReserved: { increment: quantity },
        quantityAvailable: { decrement: quantity },
        version: { increment: 1 },
      },
    });
  }

  public async releaseReservation(id: string, quantity: number, currentVersion: number, tx?: PrismaTransaction): Promise<InventoryStock> {
    const client = tx ?? this.db;
    return client.inventoryStock.update({
      where: { id, version: currentVersion },
      data: {
        quantityReserved: { decrement: quantity },
        quantityAvailable: { increment: quantity },
        version: { increment: 1 },
      },
    });
  }

  public async updateStock(id: string, quantityDelta: number, currentVersion: number, tx?: PrismaTransaction): Promise<InventoryStock> {
    const client = tx ?? this.db;
    const current = await client.inventoryStock.findUnique({ where: { id } });
    const newQty = (current?.quantityOnHand ?? 0) + quantityDelta;
    const newAvail = newQty - (current?.quantityReserved ?? 0);
    const newStatus = newQty <= 0 ? InventoryStatus.OUT_OF_STOCK : InventoryStatus.AVAILABLE;

    return client.inventoryStock.update({
      where: { id, version: currentVersion },
      data: {
        quantityOnHand: newQty,
        quantityAvailable: newAvail,
        status: newStatus,
        version: { increment: 1 },
      },
    });
  }

  public async upsertStock(
    data: { salonId: string; branchId: string; productVariantId: string; batchNumber?: string; expiryDate?: Date; quantityOnHand: number },
    tx?: PrismaTransaction,
  ): Promise<InventoryStock> {
    const client = tx ?? this.db;
    const batchNumber = data.batchNumber ?? 'DEFAULT_BATCH';
    return client.inventoryStock.upsert({
      where: {
        branchId_productVariantId_batchNumber: {
          branchId: data.branchId,
          productVariantId: data.productVariantId,
          batchNumber,
        },
      },
      create: {
        salonId: data.salonId,
        branchId: data.branchId,
        productVariantId: data.productVariantId,
        batchNumber,
        expiryDate: data.expiryDate,
        quantityOnHand: data.quantityOnHand,
        quantityAvailable: data.quantityOnHand,
        status: data.quantityOnHand <= 0 ? InventoryStatus.OUT_OF_STOCK : InventoryStatus.AVAILABLE,
      },
      update: {
        quantityOnHand: { increment: data.quantityOnHand },
        quantityAvailable: { increment: data.quantityOnHand },
        expiryDate: data.expiryDate ?? undefined,
        status: InventoryStatus.AVAILABLE,
        version: { increment: 1 },
      },
    });
  }
}

@Injectable()
export class LowStockAlertRepository implements ILowStockAlertRepository {
  constructor(private readonly db: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<LowStockAlert | null> {
    const client = tx ?? this.db;
    return client.lowStockAlert.findUnique({ where: { id }, include: { productVariant: true } });
  }

  public async findActive(branchId: string, tx?: PrismaTransaction): Promise<LowStockAlert[]> {
    const client = tx ?? this.db;
    return client.lowStockAlert.findMany({
      where: { branchId, alertStatus: AlertStatus.ACTIVE },
      include: { productVariant: true },
    });
  }

  public async create(
    data: { salonId: string; branchId: string; productVariantId: string; currentQuantity: number; reorderPoint: number },
    tx?: PrismaTransaction,
  ): Promise<LowStockAlert> {
    const client = tx ?? this.db;
    return client.lowStockAlert.create({
      data: {
        salonId: data.salonId,
        branchId: data.branchId,
        productVariantId: data.productVariantId,
        currentQuantity: data.currentQuantity,
        reorderPoint: data.reorderPoint,
        alertStatus: AlertStatus.ACTIVE,
      },
    });
  }

  public async acknowledge(id: string, userId: string, tx?: PrismaTransaction): Promise<LowStockAlert> {
    const client = tx ?? this.db;
    return client.lowStockAlert.update({
      where: { id },
      data: { alertStatus: AlertStatus.ACKNOWLEDGED, acknowledgedByUserId: userId, acknowledgedAt: new Date() },
    });
  }

  public async resolve(id: string, tx?: PrismaTransaction): Promise<LowStockAlert> {
    const client = tx ?? this.db;
    return client.lowStockAlert.update({
      where: { id },
      data: { alertStatus: AlertStatus.RESOLVED },
    });
  }
}
