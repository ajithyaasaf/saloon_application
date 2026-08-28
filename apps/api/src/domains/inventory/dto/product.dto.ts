import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

export class CreateProductVariantDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  variantName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  costPrice?: number = 0;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  retailPrice?: number = 0;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  professionalPrice?: number = 0;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  minStockLevel?: number = 5;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  reorderPoint?: number = 10;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  reorderQuantity?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  weightGrams?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  volumeMl?: number;
}

export class UpdateProductVariantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  retailPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  professionalPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  minStockLevel?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  reorderPoint?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  reorderQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateProductDto {
  @ApiProperty()
  @IsUUID()
  salonId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiProperty()
  @IsUUID()
  categoryId: string;

  @ApiProperty()
  @IsUUID()
  uomId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ProductType })
  @IsOptional()
  @IsEnum(ProductType)
  productType?: ProductType = ProductType.RETAIL;

  @ApiProperty({ type: [CreateProductVariantDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants: CreateProductVariantDto[];
}

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  uomId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ProductType })
  @IsOptional()
  @IsEnum(ProductType)
  productType?: ProductType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ProductVariantDto {
  @ApiProperty() id: string;
  @ApiProperty() productId: string;
  @ApiProperty() sku: string;
  @ApiPropertyOptional() barcode?: string;
  @ApiProperty() variantName: string;
  @ApiPropertyOptional() attributes?: any;
  @ApiProperty() costPrice: number;
  @ApiProperty() retailPrice: number;
  @ApiProperty() professionalPrice: number;
  @ApiProperty() minStockLevel: number;
  @ApiProperty() reorderPoint: number;
  @ApiProperty() reorderQuantity: number;
  @ApiPropertyOptional() weightGrams?: number;
  @ApiPropertyOptional() volumeMl?: number;
  @ApiProperty() isActive: boolean;
  @ApiProperty() version: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class ProductDto {
  @ApiProperty() id: string;
  @ApiProperty() salonId: string;
  @ApiPropertyOptional() brandId?: string;
  @ApiProperty() categoryId: string;
  @ApiProperty() uomId: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiPropertyOptional() description?: string;
  @ApiProperty() productType: ProductType;
  @ApiProperty() isActive: boolean;
  @ApiProperty() version: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiPropertyOptional({ type: [ProductVariantDto] }) variants?: ProductVariantDto[];
}

export class PaginatedProductsDto {
  @ApiProperty({ type: [ProductDto] }) data: ProductDto[];
  @ApiProperty() meta: { total: number; page: number; limit: number; totalPages: number; hasNextPage: boolean; hasPrevPage: boolean };
}

export class ProductCategoryDto {
  @ApiProperty() id: string;
  @ApiProperty() salonId: string;
  @ApiPropertyOptional() parentId?: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiPropertyOptional() description?: string;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class BrandDto {
  @ApiProperty() id: string;
  @ApiProperty() salonId: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiPropertyOptional() description?: string;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class UnitOfMeasureDto {
  @ApiProperty() id: string;
  @ApiProperty() salonId: string;
  @ApiProperty() name: string;
  @ApiProperty() code: string;
  @ApiPropertyOptional() description?: string;
  @ApiProperty() isBaseUnit: boolean;
  @ApiProperty() conversionFactor: number;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
