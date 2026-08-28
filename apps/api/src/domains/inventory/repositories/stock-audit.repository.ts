import { Injectable } from '@nestjs/common';
import { StockAudit, StockAuditItem } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CreateStockAuditDto } from '../dto/stock-audit.dto';
import { SearchAuditQueryDto } from '../dto/search-inventory.dto';
import { IStockAuditItemRepository, IStockAuditRepository } from './interfaces/stock-audit.repository.interface';

@Injectable()
export class StockAuditRepository implements IStockAuditRepository {
  constructor(private readonly db: PrismaService) {}

  public async findById(id: string): Promise<StockAudit | null> {
    return this.db.stockAudit.findUnique({
      where: { id },
      include: { items: { include: { productVariant: true } } },
    });
  }

  public async findByCode(auditCode: string): Promise<StockAudit | null> {
    return this.db.stockAudit.findUnique({
      where: { auditCode },
      include: { items: true },
    });
  }

  public async findByBranch(branchId: string): Promise<StockAudit[]> {
    return this.db.stockAudit.findMany({
      where: { branchId },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async search(query: SearchAuditQueryDto): Promise<{ data: StockAudit[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.salonId) where.salonId = query.salonId;
    if (query.branchId) where.branchId = query.branchId;
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.db.stockAudit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
      this.db.stockAudit.count({ where }),
    ]);

    return { data, total };
  }

  public async create(dto: CreateStockAuditDto, auditCode: string, userId: string): Promise<StockAudit> {
    let totalExp = 0;
    let totalDiscrepancy = 0;
    let netVariance = 0;

    const itemsData = dto.items.map((i) => {
      const variance = i.countedQuantity - i.expectedQuantity;
      const varVal = variance * i.unitCostPrice;
      totalExp += i.expectedQuantity;
      if (variance !== 0) totalDiscrepancy += 1;
      netVariance += varVal;

      return {
        productVariantId: i.productVariantId,
        batchNumber: i.batchNumber ?? 'DEFAULT_BATCH',
        expectedQuantity: i.expectedQuantity,
        countedQuantity: i.countedQuantity,
        varianceQuantity: variance,
        unitCostPrice: i.unitCostPrice,
        varianceValue: varVal,
        notes: i.notes,
      };
    });

    return this.db.stockAudit.create({
      data: {
        auditCode,
        salonId: dto.salonId,
        branchId: dto.branchId,
        auditType: dto.auditType ?? 'FULL',
        conductedByUserId: userId,
        totalExpectedItems: totalExp,
        totalDiscrepancyItems: totalDiscrepancy,
        netVarianceValue: netVariance,
        notes: dto.notes,
        items: {
          create: itemsData,
        },
      },
      include: { items: true },
    });
  }

  public async updateStatus(id: string, status: any, userId?: string): Promise<StockAudit> {
    const updateData: any = { status, version: { increment: 1 } };
    if (status === 'COMPLETED' && userId) {
      updateData.approvedByUserId = userId;
      updateData.approvedAt = new Date();
    }

    return this.db.stockAudit.update({
      where: { id },
      data: updateData,
      include: { items: true },
    });
  }
}

@Injectable()
export class StockAuditItemRepository implements IStockAuditItemRepository {
  constructor(private readonly db: PrismaService) {}

  public async findByAudit(stockAuditId: string): Promise<StockAuditItem[]> {
    return this.db.stockAuditItem.findMany({ where: { stockAuditId } });
  }
}
