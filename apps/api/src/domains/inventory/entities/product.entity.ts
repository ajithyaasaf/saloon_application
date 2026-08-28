import { ProductType } from '@prisma/client';

export class ProductEntity {
  id: string;
  salonId: string;
  brandId?: string | null;
  categoryId: string;
  uomId: string;
  name: string;
  slug: string;
  description?: string | null;
  productType: ProductType;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  variants?: ProductVariantEntity[];

  constructor(partial: Partial<ProductEntity>) {
    Object.assign(this, partial);
  }

  public isAvailable(): boolean {
    return this.isActive && !this.deletedAt;
  }
}

export class ProductVariantEntity {
  id: string;
  productId: string;
  sku: string;
  barcode?: string | null;
  variantName: string;
  attributes?: Record<string, any> | null;
  costPrice: number;
  retailPrice: number;
  professionalPrice: number;
  minStockLevel: number;
  reorderPoint: number;
  reorderQuantity: number;
  weightGrams?: number | null;
  volumeMl?: number | null;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  constructor(partial: Partial<ProductVariantEntity>) {
    Object.assign(this, partial);
  }

  public isAvailable(): boolean {
    return this.isActive && !this.deletedAt;
  }
}

export class ProductCategoryEntity {
  id: string;
  salonId: string;
  parentCategoryId?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  constructor(partial: Partial<ProductCategoryEntity>) {
    Object.assign(this, partial);
  }
}

export class BrandEntity {
  id: string;
  salonId: string;
  name: string;
  description?: string | null;
  websiteUrl?: string | null;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  constructor(partial: Partial<BrandEntity>) {
    Object.assign(this, partial);
  }
}

export class UnitOfMeasureEntity {
  id: string;
  salonId: string;
  name: string;
  code: string;
  unitType: string;
  baseUnitId?: string | null;
  conversionFactor?: number | null;
  isSystemDefault: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<UnitOfMeasureEntity>) {
    Object.assign(this, partial);
  }
}
