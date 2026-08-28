import { ProductUsage } from '@prisma/client';
import { CreateProductUsageDto } from '../../dto/product-usage.dto';

export interface IProductUsageRepository {
  findById(id: string): Promise<ProductUsage | null>;
  findByCode(usageCode: string): Promise<ProductUsage | null>;
  findByReference(referenceType: string, referenceId: string): Promise<ProductUsage[]>;
  findByProduct(productVariantId: string): Promise<ProductUsage[]>;
  findByBranch(branchId: string): Promise<ProductUsage[]>;
  create(dto: CreateProductUsageDto, usageCode: string): Promise<ProductUsage>;
}
