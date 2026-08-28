import { Injectable } from '@nestjs/common';
import { StockMovement } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { SearchMovementQueryDto } from '../dto/search-inventory.dto';
import { IStockMovementRepository } from './interfaces/stock-movement.repository.interface';

@Injectable()
export class StockMovementRepository implements IStockMovementRepository {
  constructor(private readonly db: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<StockMovement | null> {
    const client = tx ?? this.db;
    return client.stockMovement.findUnique({
      where: { id },
      include: { productVariant: true },
    });
  }

  public async create(
    data: {
      movementCode: string;
      salonId: string;
      branchId: string;
      productVariantId: string;
      batchNumber?: string;
      type: any;
      quantity: number;
      unitCostPrice?: number;
      totalValue?: number;
      previousQuantity: number;
      newQuantity: number;
      referenceType?: string;
      referenceId?: string;
      notes?: string;
      actorUserId: string;
    },
    tx?: PrismaTransaction,
  ): Promise<StockMovement> {
    const client = tx ?? this.db;
    return client.stockMovement.create({
      data: {
        movementCode: data.movementCode,
        salonId: data.salonId,
        branchId: data.branchId,
        productVariantId: data.productVariantId,
        batchNumber: data.batchNumber ?? 'DEFAULT_BATCH',
        type: data.type,
        quantity: data.quantity,
        unitCostPrice: data.unitCostPrice ?? 0,
        totalValue: data.totalValue ?? Math.abs(data.quantity * (data.unitCostPrice ?? 0)),
        previousQuantity: data.previousQuantity,
        newQuantity: data.newQuantity,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        notes: data.notes,
        actorUserId: data.actorUserId,
      },
    });
  }

  public async findByReference(referenceType: string, referenceId: string, tx?: PrismaTransaction): Promise<StockMovement[]> {
    const client = tx ?? this.db;
    return client.stockMovement.findMany({
      where: { referenceType, referenceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findByVariant(productVariantId: string, tx?: PrismaTransaction): Promise<StockMovement[]> {
    const client = tx ?? this.db;
    return client.stockMovement.findMany({
      where: { productVariantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findByBranch(branchId: string, tx?: PrismaTransaction): Promise<StockMovement[]> {
    const client = tx ?? this.db;
    return client.stockMovement.findMany({
      where: { branchId },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async search(query: SearchMovementQueryDto, tx?: PrismaTransaction): Promise<{ data: StockMovement[]; total: number }> {
    const client = tx ?? this.db;
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.salonId) where.salonId = query.salonId;
    if (query.branchId) where.branchId = query.branchId;
    if (query.productVariantId) where.productVariantId = query.productVariantId;
    if (query.type) where.type = query.type;
    if (query.referenceType) where.referenceType = query.referenceType;
    if (query.referenceId) where.referenceId = query.referenceId;

    const [data, total] = await Promise.all([
      client.stockMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { productVariant: true },
      }),
      client.stockMovement.count({ where }),
    ]);

    return { data, total };
  }
}
