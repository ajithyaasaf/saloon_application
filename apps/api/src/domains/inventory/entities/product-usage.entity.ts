import { ProductUsageType } from '@prisma/client';

export class ProductUsageEntity {
  id: string;
  usageCode: string;
  salonId: string;
  branchId: string;
  productVariantId: string;
  batchNumber: string;
  usageType: ProductUsageType;
  quantity: number;
  referenceType?: string | null;
  referenceId?: string | null;
  usedByStaffId?: string | null;
  usedAt: Date;
  version: number;
  createdAt: Date;

  constructor(partial: Partial<ProductUsageEntity>) {
    Object.assign(this, partial);
  }
}
