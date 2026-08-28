import { Injectable, Logger } from '@nestjs/common';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import {
  CreateProductDto,
  CreateProductVariantDto,
  UpdateProductDto,
  UpdateProductVariantDto,
} from '../dto/product.dto';
import { SearchProductQueryDto } from '../dto/search-inventory.dto';
import { ProductEntity, ProductVariantEntity } from '../entities/product.entity';
import {
  ProductArchivedEvent,
  ProductCreatedEvent,
  ProductUpdatedEvent,
} from '../events/inventory-events.event';
import {
  BrandRepository,
  ProductCategoryRepository,
  ProductRepository,
  ProductVariantRepository,
  UnitOfMeasureRepository,
} from '../repositories/product.repository';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    private readonly productRepo: ProductRepository,
    private readonly variantRepo: ProductVariantRepository,
    private readonly categoryRepo: ProductCategoryRepository,
    private readonly brandRepo: BrandRepository,
    private readonly uomRepo: UnitOfMeasureRepository,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBus: EventBusService,
  ) {}

  public async createProduct(dto: CreateProductDto, actorUserId: string): Promise<ProductEntity> {
    const category = await this.categoryRepo.findById(dto.categoryId);
    if (!category || category.salonId !== dto.salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.CATEGORY_NOT_FOUND, 'Product category not found for this salon');
    }

    if (dto.brandId) {
      const brand = await this.brandRepo.findById(dto.brandId);
      if (!brand || brand.salonId !== dto.salonId) {
        throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.BRAND_NOT_FOUND, 'Brand not found for this salon');
      }
    }

    const uom = await this.uomRepo.findById(dto.uomId);
    if (!uom || uom.salonId !== dto.salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.UOM_NOT_FOUND, 'Unit of measure not found for this salon');
    }

    if (!dto.variants || dto.variants.length === 0) {
      throw new ValidationException('Product must have at least one variant');
    }

    for (const v of dto.variants) {
      if (v.barcode) {
        const existingBarcode = await this.variantRepo.findByBarcode(v.barcode);
        if (existingBarcode) {
          throw new ConflictException(ERROR_CODES.DATABASE.UNIQUE_VIOLATION, `Barcode ${v.barcode} is already assigned to another variant`);
        }
      }
    }

    const product = await this.transactionService.run(async (tx) => {
      const created = await this.productRepo.create(dto);
      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'SALON_OWNER',
        action: 'CREATE',
        entityType: 'Product',
        entityId: created.id,
        newState: created as any,
      });
      return created;
    });

    await this.eventBus.publish(
      new ProductCreatedEvent(
        {
          productId: product.id,
          salonId: product.salonId,
          name: product.name,
          slug: product.slug,
        },
        actorUserId,
      ),
    );

    return new ProductEntity(product as any);
  }

  public async updateProduct(
    id: string,
    salonId: string,
    dto: UpdateProductDto,
    actorUserId: string,
  ): Promise<ProductEntity> {
    const existing = await this.productRepo.findById(id);
    if (!existing || existing.salonId !== salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.PRODUCT_NOT_FOUND, 'Product not found');
    }

    if (dto.categoryId) {
      const category = await this.categoryRepo.findById(dto.categoryId);
      if (!category || category.salonId !== salonId) {
        throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.CATEGORY_NOT_FOUND, 'Category not found for this salon');
      }
    }

    if (dto.brandId) {
      const brand = await this.brandRepo.findById(dto.brandId);
      if (!brand || brand.salonId !== salonId) {
        throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.BRAND_NOT_FOUND, 'Brand not found for this salon');
      }
    }

    const updated = await this.transactionService.run(async (tx) => {
      const res = await this.productRepo.update(id, dto);
      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'SALON_OWNER',
        action: 'UPDATE',
        entityType: 'Product',
        entityId: id,
        previousState: existing as any,
        newState: res as any,
      });
      return res;
    });

    await this.cacheService.delete(`product:${id}:detail`);
    await this.eventBus.publish(
      new ProductUpdatedEvent(
        {
          productId: id,
          salonId,
          updatedFields: Object.keys(dto),
        },
        actorUserId,
      ),
    );

    return new ProductEntity(updated as any);
  }

  public async archiveProduct(id: string, salonId: string, actorUserId: string): Promise<ProductEntity> {
    const existing = await this.productRepo.findById(id);
    if (!existing || existing.salonId !== salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.PRODUCT_NOT_FOUND, 'Product not found');
    }

    const archived = await this.transactionService.run(async (tx) => {
      const res = await this.productRepo.softDelete(id);
      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'SALON_OWNER',
        action: 'ARCHIVE',
        entityType: 'Product',
        entityId: id,
        previousState: existing as any,
        newState: res as any,
      });
      return res;
    });

    await this.cacheService.delete(`product:${id}:detail`);
    await this.eventBus.publish(new ProductArchivedEvent({ productId: id, salonId }, actorUserId));

    return new ProductEntity(archived as any);
  }

  public async restoreProduct(id: string, salonId: string, actorUserId: string): Promise<ProductEntity> {
    const existing = await this.productRepo.findById(id);
    if (!existing || existing.salonId !== salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.PRODUCT_NOT_FOUND, 'Product not found');
    }

    const restored = await this.productRepo.update(id, { isActive: true });
    await this.cacheService.delete(`product:${id}:detail`);
    return new ProductEntity(restored as any);
  }

  public async getProduct(id: string, salonId: string): Promise<ProductEntity> {
    const cached = await this.cacheService.get<ProductEntity>(`product:${id}:detail`);
    if (cached) return new ProductEntity(cached);

    const product = await this.productRepo.findById(id);
    if (!product || product.salonId !== salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.PRODUCT_NOT_FOUND, 'Product not found');
    }

    const entity = new ProductEntity(product as any);
    await this.cacheService.set(`product:${id}:detail`, entity, 1800);
    return entity;
  }

  public async searchProducts(query: SearchProductQueryDto): Promise<{ data: ProductEntity[]; total: number }> {
    const result = await this.productRepo.search(query);
    return {
      data: result.data.map((p) => new ProductEntity(p as any)),
      total: result.total,
    };
  }

  public async createVariant(
    productId: string,
    salonId: string,
    dto: CreateProductVariantDto,
    actorUserId: string,
  ): Promise<ProductVariantEntity> {
    const product = await this.productRepo.findById(productId);
    if (!product || product.salonId !== salonId || product.deletedAt) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.PRODUCT_NOT_FOUND, 'Active product not found');
    }

    const existingSku = await this.variantRepo.findBySku(productId, dto.sku);
    if (existingSku) {
      throw new ConflictException(ERROR_CODES.DATABASE.UNIQUE_VIOLATION, `SKU ${dto.sku} already exists for this product`);
    }

    if (dto.barcode) {
      const existingBarcode = await this.variantRepo.findByBarcode(dto.barcode);
      if (existingBarcode) {
        throw new ConflictException(ERROR_CODES.DATABASE.UNIQUE_VIOLATION, `Barcode ${dto.barcode} is already assigned to another variant`);
      }
    }

    const created = await this.variantRepo.create(productId, dto);
    await this.cacheService.delete(`product:${productId}:detail`);
    return new ProductVariantEntity(created as any);
  }

  public async updateVariant(
    id: string,
    salonId: string,
    dto: UpdateProductVariantDto,
    actorUserId: string,
  ): Promise<ProductVariantEntity> {
    const variant = await this.variantRepo.findById(id);
    if (!variant) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.VARIANT_NOT_FOUND, 'Product variant not found');
    }

    const product = await this.productRepo.findById(variant.productId);
    if (!product || product.salonId !== salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.PRODUCT_NOT_FOUND, 'Product not found');
    }

    if (dto.barcode && dto.barcode !== variant.barcode) {
      const existingBarcode = await this.variantRepo.findByBarcode(dto.barcode);
      if (existingBarcode && existingBarcode.id !== id) {
        throw new ConflictException(ERROR_CODES.DATABASE.UNIQUE_VIOLATION, `Barcode ${dto.barcode} is already in use`);
      }
    }

    const updated = await this.variantRepo.update(id, dto);
    await this.cacheService.delete(`product:${product.id}:detail`);
    return new ProductVariantEntity(updated as any);
  }

  public async archiveVariant(id: string, salonId: string, actorUserId: string): Promise<ProductVariantEntity> {
    const variant = await this.variantRepo.findById(id);
    if (!variant) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.VARIANT_NOT_FOUND, 'Product variant not found');
    }

    const product = await this.productRepo.findById(variant.productId);
    if (!product || product.salonId !== salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.PRODUCT_NOT_FOUND, 'Product not found');
    }

    const archived = await this.variantRepo.softDelete(id);
    await this.cacheService.delete(`product:${product.id}:detail`);
    return new ProductVariantEntity(archived as any);
  }

  public async getVariant(id: string, salonId: string): Promise<ProductVariantEntity> {
    const variant = await this.variantRepo.findById(id);
    if (!variant) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.VARIANT_NOT_FOUND, 'Product variant not found');
    }
    const product = await this.productRepo.findById(variant.productId);
    if (!product || product.salonId !== salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.PRODUCT_NOT_FOUND, 'Product not found');
    }
    return new ProductVariantEntity(variant as any);
  }
}
