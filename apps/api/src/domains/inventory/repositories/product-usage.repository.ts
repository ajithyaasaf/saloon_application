import { Injectable } from '@nestjs/common';
import { ProductUsage } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CreateProductUsageDto } from '../dto/product-usage.dto';
import { IProductUsageRepository } from './interfaces/product-usage.repository.interface';

@Injectable()
export class ProductUsageRepository implements IProductUsageRepository {
  constructor(private readonly db: PrismaService) {}

  public async findById(id: string): Promise<ProductUsage | null> {
    return this.db.productUsage.findUnique({
      where: { id },
      include: { productVariant: true },
    });
  }

  public async findByCode(usageCode: string): Promise<ProductUsage | null> {
    return this.db.productUsage.findUnique({
      where: { usageCode },
      include: { productVariant: true },
    });
  }

  public async findByReference(referenceType: string, referenceId: string): Promise<ProductUsage[]> {
    return this.db.productUsage.findMany({
      where: { referenceType, referenceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findByProduct(productVariantId: string): Promise<ProductUsage[]> {
    return this.db.productUsage.findMany({
      where: { productVariantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findByBranch(branchId: string): Promise<ProductUsage[]> {
    return this.db.productUsage.findMany({
      where: { branchId },
      orderBy: { usedAt: 'desc' },
      include: { productVariant: true },
    });
  }

  public async create(dto: CreateProductUsageDto, usageCode: string): Promise<ProductUsage> {
    return this.db.productUsage.create({
      data: {
        usageCode,
        salonId: dto.salonId,
        branchId: dto.branchId,
        productVariantId: dto.productVariantId,
        batchNumber: dto.batchNumber ?? 'DEFAULT_BATCH',
        usageType: dto.usageType,
        quantity: dto.quantity,
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        usedByStaffId: dto.usedByStaffId,
      },
    });
  }
}
