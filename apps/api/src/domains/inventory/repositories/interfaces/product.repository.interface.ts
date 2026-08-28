import { Product, ProductCategory, Brand, UnitOfMeasure, ProductVariant } from '@prisma/client';
import { CreateProductDto, CreateProductVariantDto, UpdateProductDto, UpdateProductVariantDto } from '../../dto/product.dto';
import { SearchProductQueryDto } from '../../dto/search-inventory.dto';

export interface IProductRepository {
  findById(id: string): Promise<Product | null>;
  findBySlug(salonId: string, slug: string): Promise<Product | null>;
  findBySalon(salonId: string): Promise<Product[]>;
  findActive(salonId: string): Promise<Product[]>;
  search(query: SearchProductQueryDto): Promise<{ data: Product[]; total: number }>;
  count(salonId: string): Promise<number>;
  create(dto: CreateProductDto): Promise<Product>;
  update(id: string, dto: UpdateProductDto): Promise<Product>;
  softDelete(id: string): Promise<Product>;
}

export interface IProductVariantRepository {
  findById(id: string): Promise<ProductVariant | null>;
  findBySku(productId: string, sku: string): Promise<ProductVariant | null>;
  findByBarcode(barcode: string): Promise<ProductVariant | null>;
  findByProduct(productId: string): Promise<ProductVariant[]>;
  create(productId: string, dto: CreateProductVariantDto): Promise<ProductVariant>;
  update(id: string, dto: UpdateProductVariantDto): Promise<ProductVariant>;
  softDelete(id: string): Promise<ProductVariant>;
}

export interface IProductCategoryRepository {
  findById(id: string): Promise<ProductCategory | null>;
  findBySalon(salonId: string): Promise<ProductCategory[]>;
  create(data: any): Promise<ProductCategory>;
  update(id: string, data: any): Promise<ProductCategory>;
  softDelete(id: string): Promise<ProductCategory>;
}

export interface IBrandRepository {
  findById(id: string): Promise<Brand | null>;
  findBySalon(salonId: string): Promise<Brand[]>;
  create(data: any): Promise<Brand>;
  update(id: string, data: any): Promise<Brand>;
  softDelete(id: string): Promise<Brand>;
}

export interface IUnitOfMeasureRepository {
  findById(id: string): Promise<UnitOfMeasure | null>;
  findBySalon(salonId: string): Promise<UnitOfMeasure[]>;
  create(data: any): Promise<UnitOfMeasure>;
}
