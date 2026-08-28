import { Injectable } from '@nestjs/common';
import { Product, ProductCategory, Brand, UnitOfMeasure, ProductVariant } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CreateProductDto, CreateProductVariantDto, UpdateProductDto, UpdateProductVariantDto } from '../dto/product.dto';
import { SearchProductQueryDto } from '../dto/search-inventory.dto';
import { IBrandRepository, IProductCategoryRepository, IProductRepository, IProductVariantRepository, IUnitOfMeasureRepository } from './interfaces/product.repository.interface';

@Injectable()
export class ProductRepository implements IProductRepository {
  constructor(private readonly db: PrismaService) {}

  public async findById(id: string): Promise<Product | null> {
    return this.db.product.findFirst({
      where: { id, deletedAt: null },
      include: { variants: { where: { deletedAt: null } }, brand: true, category: true, uom: true },
    });
  }

  public async findBySlug(salonId: string, slug: string): Promise<Product | null> {
    return this.db.product.findFirst({
      where: { salonId, slug, deletedAt: null },
      include: { variants: { where: { deletedAt: null } } },
    });
  }

  public async findBySalon(salonId: string): Promise<Product[]> {
    return this.db.product.findMany({
      where: { salonId, deletedAt: null },
      include: { variants: { where: { deletedAt: null } } },
    });
  }

  public async findActive(salonId: string): Promise<Product[]> {
    return this.db.product.findMany({
      where: { salonId, isActive: true, deletedAt: null },
      include: { variants: { where: { deletedAt: null, isActive: true } } },
    });
  }

  public async search(query: SearchProductQueryDto): Promise<{ data: Product[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (query.salonId) where.salonId = query.salonId;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.brandId) where.brandId = query.brandId;
    if (query.productType) where.productType = query.productType;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.db.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { variants: { where: { deletedAt: null } }, brand: true, category: true, uom: true },
      }),
      this.db.product.count({ where }),
    ]);

    return { data, total };
  }

  public async count(salonId: string): Promise<number> {
    return this.db.product.count({
      where: { salonId, deletedAt: null },
    });
  }

  public async create(dto: CreateProductDto): Promise<Product> {
    const slug = dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
    return this.db.product.create({
      data: {
        salonId: dto.salonId,
        brandId: dto.brandId,
        categoryId: dto.categoryId,
        uomId: dto.uomId,
        name: dto.name,
        slug,
        description: dto.description,
        productType: dto.productType,
        variants: {
          create: dto.variants.map((v) => ({
            sku: v.sku,
            barcode: v.barcode,
            variantName: v.variantName,
            attributes: v.attributes,
            costPrice: v.costPrice ?? 0,
            retailPrice: v.retailPrice ?? 0,
            professionalPrice: v.professionalPrice ?? 0,
            minStockLevel: v.minStockLevel ?? 5,
            reorderPoint: v.reorderPoint ?? 10,
            reorderQuantity: v.reorderQuantity ?? 20,
            weightGrams: v.weightGrams,
            volumeMl: v.volumeMl,
          })),
        },
      },
      include: { variants: true },
    });
  }

  public async update(id: string, dto: UpdateProductDto): Promise<Product> {
    return this.db.product.update({
      where: { id },
      data: {
        ...dto,
        version: { increment: 1 },
      },
      include: { variants: { where: { deletedAt: null } } },
    });
  }

  public async softDelete(id: string): Promise<Product> {
    return this.db.product.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}

@Injectable()
export class ProductVariantRepository implements IProductVariantRepository {
  constructor(private readonly db: PrismaService) {}

  public async findById(id: string): Promise<ProductVariant | null> {
    return this.db.productVariant.findFirst({
      where: { id, deletedAt: null },
    });
  }

  public async findBySku(productId: string, sku: string): Promise<ProductVariant | null> {
    return this.db.productVariant.findFirst({
      where: { productId, sku, deletedAt: null },
    });
  }

  public async findByBarcode(barcode: string): Promise<ProductVariant | null> {
    return this.db.productVariant.findFirst({
      where: { barcode, deletedAt: null },
    });
  }

  public async findByProduct(productId: string): Promise<ProductVariant[]> {
    return this.db.productVariant.findMany({
      where: { productId, deletedAt: null },
    });
  }

  public async create(productId: string, dto: CreateProductVariantDto): Promise<ProductVariant> {
    return this.db.productVariant.create({
      data: {
        productId,
        ...dto,
      },
    });
  }

  public async update(id: string, dto: UpdateProductVariantDto): Promise<ProductVariant> {
    return this.db.productVariant.update({
      where: { id },
      data: {
        ...dto,
        version: { increment: 1 },
      },
    });
  }

  public async softDelete(id: string): Promise<ProductVariant> {
    return this.db.productVariant.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}

@Injectable()
export class ProductCategoryRepository implements IProductCategoryRepository {
  constructor(private readonly db: PrismaService) {}

  public async findById(id: string): Promise<ProductCategory | null> {
    return this.db.productCategory.findFirst({ where: { id, deletedAt: null } });
  }

  public async findBySalon(salonId: string): Promise<ProductCategory[]> {
    return this.db.productCategory.findMany({ where: { salonId, deletedAt: null } });
  }

  public async create(data: any): Promise<ProductCategory> {
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
    return this.db.productCategory.create({ data: { ...data, slug } });
  }

  public async update(id: string, data: any): Promise<ProductCategory> {
    return this.db.productCategory.update({ where: { id }, data: { ...data, version: { increment: 1 } } });
  }

  public async softDelete(id: string): Promise<ProductCategory> {
    return this.db.productCategory.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  }
}

@Injectable()
export class BrandRepository implements IBrandRepository {
  constructor(private readonly db: PrismaService) {}

  public async findById(id: string): Promise<Brand | null> {
    return this.db.brand.findFirst({ where: { id, deletedAt: null } });
  }

  public async findBySalon(salonId: string): Promise<Brand[]> {
    return this.db.brand.findMany({ where: { salonId, deletedAt: null } });
  }

  public async create(data: any): Promise<Brand> {
    return this.db.brand.create({ data });
  }

  public async update(id: string, data: any): Promise<Brand> {
    return this.db.brand.update({ where: { id }, data: { ...data, version: { increment: 1 } } });
  }

  public async softDelete(id: string): Promise<Brand> {
    return this.db.brand.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  }
}

@Injectable()
export class UnitOfMeasureRepository implements IUnitOfMeasureRepository {
  constructor(private readonly db: PrismaService) {}

  public async findById(id: string): Promise<UnitOfMeasure | null> {
    return this.db.unitOfMeasure.findUnique({ where: { id } });
  }

  public async findBySalon(salonId: string): Promise<UnitOfMeasure[]> {
    return this.db.unitOfMeasure.findMany({ where: { salonId } });
  }

  public async create(data: any): Promise<UnitOfMeasure> {
    return this.db.unitOfMeasure.create({ data });
  }
}
