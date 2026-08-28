import { Injectable } from '@nestjs/common';
import { StockTransfer, StockTransferItem } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { CreateStockTransferDto } from '../dto/stock-transfer.dto';
import { SearchTransferQueryDto } from '../dto/search-inventory.dto';
import { IStockTransferItemRepository, IStockTransferRepository } from './interfaces/stock-transfer.repository.interface';

@Injectable()
export class StockTransferRepository implements IStockTransferRepository {
  constructor(private readonly db: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<StockTransfer | null> {
    const client = tx ?? this.db;
    return client.stockTransfer.findUnique({
      where: { id },
      include: { items: { include: { productVariant: true } }, sourceBranch: true, destinationBranch: true },
    });
  }

  public async findByCode(transferCode: string, tx?: PrismaTransaction): Promise<StockTransfer | null> {
    const client = tx ?? this.db;
    return client.stockTransfer.findUnique({
      where: { transferCode },
      include: { items: true },
    });
  }

  public async findPending(branchId: string, tx?: PrismaTransaction): Promise<StockTransfer[]> {
    const client = tx ?? this.db;
    return client.stockTransfer.findMany({
      where: {
        OR: [{ sourceBranchId: branchId }, { destinationBranchId: branchId }],
        status: { in: ['PENDING_DISPATCH', 'DISPATCHED'] },
      },
      include: { items: true },
    });
  }

  public async findBySourceBranch(sourceBranchId: string, tx?: PrismaTransaction): Promise<StockTransfer[]> {
    const client = tx ?? this.db;
    return client.stockTransfer.findMany({
      where: { sourceBranchId },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findByDestinationBranch(destinationBranchId: string, tx?: PrismaTransaction): Promise<StockTransfer[]> {
    const client = tx ?? this.db;
    return client.stockTransfer.findMany({
      where: { destinationBranchId },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async search(query: SearchTransferQueryDto, tx?: PrismaTransaction): Promise<{ data: StockTransfer[]; total: number }> {
    const client = tx ?? this.db;
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.salonId) where.salonId = query.salonId;
    if (query.sourceBranchId) where.sourceBranchId = query.sourceBranchId;
    if (query.destinationBranchId) where.destinationBranchId = query.destinationBranchId;
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      client.stockTransfer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
      client.stockTransfer.count({ where }),
    ]);

    return { data, total };
  }

  public async create(dto: CreateStockTransferDto, transferCode: string, tx?: PrismaTransaction): Promise<StockTransfer> {
    const client = tx ?? this.db;
    return client.stockTransfer.create({
      data: {
        transferCode,
        salonId: dto.salonId,
        sourceBranchId: dto.sourceBranchId,
        destinationBranchId: dto.destinationBranchId,
        notes: dto.notes,
        items: {
          create: dto.items.map((i) => ({
            productVariantId: i.productVariantId,
            batchNumber: i.batchNumber ?? 'DEFAULT_BATCH',
            dispatchedQuantity: i.dispatchedQuantity,
          })),
        },
      },
      include: { items: true },
    });
  }

  public async updateStatus(id: string, status: any, userId?: string, tx?: PrismaTransaction): Promise<StockTransfer> {
    const client = tx ?? this.db;
    const updateData: any = { status, version: { increment: 1 } };
    if (status === 'DISPATCHED' && userId) {
      updateData.dispatchedByUserId = userId;
      updateData.dispatchedAt = new Date();
    }
    if (status === 'FULLY_RECEIVED' && userId) {
      updateData.receivedByUserId = userId;
      updateData.receivedAt = new Date();
    }

    return client.stockTransfer.update({
      where: { id },
      data: updateData,
      include: { items: true },
    });
  }
}

@Injectable()
export class StockTransferItemRepository implements IStockTransferItemRepository {
  constructor(private readonly db: PrismaService) {}

  public async findByTransfer(stockTransferId: string, tx?: PrismaTransaction): Promise<StockTransferItem[]> {
    const client = tx ?? this.db;
    return client.stockTransferItem.findMany({ where: { stockTransferId } });
  }
}
