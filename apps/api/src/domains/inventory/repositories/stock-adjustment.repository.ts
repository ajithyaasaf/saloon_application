import { Injectable } from '@nestjs/common';
import { StockAdjustment, StockAdjustmentItem } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { CreateStockAdjustmentDto } from '../dto/stock-adjustment.dto';
import { IStockAdjustmentItemRepository, IStockAdjustmentRepository } from './interfaces/stock-adjustment.repository.interface';

@Injectable()
export class StockAdjustmentRepository implements IStockAdjustmentRepository {
  constructor(private readonly db: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<StockAdjustment | null> {
    const client = tx ?? this.db;
    return client.stockAdjustment.findUnique({
      where: { id },
      include: { items: { include: { productVariant: true } } },
    });
  }

  public async findByCode(adjustmentCode: string, tx?: PrismaTransaction): Promise<StockAdjustment | null> {
    const client = tx ?? this.db;
    return client.stockAdjustment.findUnique({
      where: { adjustmentCode },
      include: { items: true },
    });
  }

  public async findByBranch(branchId: string, tx?: PrismaTransaction): Promise<StockAdjustment[]> {
    const client = tx ?? this.db;
    return client.stockAdjustment.findMany({
      where: { branchId },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
  }

  public async create(dto: CreateStockAdjustmentDto, adjustmentCode: string, userId: string, tx?: PrismaTransaction): Promise<StockAdjustment> {
    const client = tx ?? this.db;
    const itemsData = dto.items.map((i) => {
      const adjQty = i.actualQuantity - i.systemQuantity;
      return {
        productVariantId: i.productVariantId,
        batchNumber: i.batchNumber ?? 'DEFAULT_BATCH',
        systemQuantity: i.systemQuantity,
        actualQuantity: i.actualQuantity,
        adjustmentQuantity: adjQty,
        unitCostPrice: i.unitCostPrice,
        totalVarianceValue: Math.abs(adjQty * i.unitCostPrice),
      };
    });

    return client.stockAdjustment.create({
      data: {
        adjustmentCode,
        salonId: dto.salonId,
        branchId: dto.branchId,
        reason: dto.reason,
        requestedByUserId: userId,
        notes: dto.notes,
        items: {
          create: itemsData,
        },
      },
      include: { items: true },
    });
  }

  public async approve(id: string, userId: string, tx?: PrismaTransaction): Promise<StockAdjustment> {
    const client = tx ?? this.db;
    return client.stockAdjustment.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedByUserId: userId,
        approvedAt: new Date(),
        version: { increment: 1 },
      },
      include: { items: true },
    });
  }

  public async reject(id: string, userId: string, tx?: PrismaTransaction): Promise<StockAdjustment> {
    const client = tx ?? this.db;
    return client.stockAdjustment.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedByUserId: userId,
        version: { increment: 1 },
      },
    });
  }
}

@Injectable()
export class StockAdjustmentItemRepository implements IStockAdjustmentItemRepository {
  constructor(private readonly db: PrismaService) {}

  public async findByAdjustment(stockAdjustmentId: string, tx?: PrismaTransaction): Promise<StockAdjustmentItem[]> {
    const client = tx ?? this.db;
    return client.stockAdjustmentItem.findMany({ where: { stockAdjustmentId } });
  }
}
