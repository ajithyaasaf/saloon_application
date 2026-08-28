import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import {
  BrandRepository,
  ProductCategoryRepository,
  ProductRepository,
  ProductVariantRepository,
  UnitOfMeasureRepository,
} from '../repositories/product.repository';
import { ProductService } from '../services/product.service';

describe('ProductService', () => {
  let service: ProductService;
  let productRepo: any;
  let variantRepo: any;
  let categoryRepo: any;
  let brandRepo: any;
  let uomRepo: any;
  let txService: any;
  let auditService: any;
  let cacheService: any;
  let eventBus: any;

  const mockProduct = {
    id: 'prod-1',
    salonId: 'sal-1',
    categoryId: 'cat-1',
    uomId: 'uom-1',
    name: 'Herbal Shampoo',
    slug: 'herbal-shampoo-123',
    productType: 'RETAIL',
    isActive: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockVariant = {
    id: 'var-1',
    productId: 'prod-1',
    sku: 'SKU-001',
    barcode: 'BAR-001',
    variantName: '250ml',
    costPrice: 100,
    retailPrice: 200,
    isActive: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    productRepo = {
      findById: jest.fn().mockResolvedValue(mockProduct),
      create: jest.fn().mockResolvedValue(mockProduct),
      update: jest.fn().mockResolvedValue({ ...mockProduct, name: 'Updated' }),
      softDelete: jest.fn().mockResolvedValue({ ...mockProduct, isActive: false, deletedAt: new Date() }),
      search: jest.fn().mockResolvedValue({ data: [mockProduct], total: 1 }),
    };

    variantRepo = {
      findById: jest.fn().mockResolvedValue(mockVariant),
      findBySku: jest.fn().mockResolvedValue(null),
      findByBarcode: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(mockVariant),
      update: jest.fn().mockResolvedValue(mockVariant),
      softDelete: jest.fn().mockResolvedValue({ ...mockVariant, deletedAt: new Date() }),
    };

    categoryRepo = {
      findById: jest.fn().mockResolvedValue({ id: 'cat-1', salonId: 'sal-1' }),
    };

    brandRepo = {
      findById: jest.fn().mockResolvedValue({ id: 'brand-1', salonId: 'sal-1' }),
    };

    uomRepo = {
      findById: jest.fn().mockResolvedValue({ id: 'uom-1', salonId: 'sal-1' }),
    };

    txService = {
      run: jest.fn().mockImplementation((cb) => cb({})),
    };

    auditService = {
      logInTransaction: jest.fn().mockResolvedValue(undefined),
    };

    cacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    eventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: ProductRepository, useValue: productRepo },
        { provide: ProductVariantRepository, useValue: variantRepo },
        { provide: ProductCategoryRepository, useValue: categoryRepo },
        { provide: BrandRepository, useValue: brandRepo },
        { provide: UnitOfMeasureRepository, useValue: uomRepo },
        { provide: TransactionService, useValue: txService },
        { provide: AuditService, useValue: auditService },
        { provide: CacheService, useValue: cacheService },
        { provide: EventBusService, useValue: eventBus },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  describe('createProduct', () => {
    it('should create product, log audit, and publish event', async () => {
      const res = await service.createProduct(
        {
          salonId: 'sal-1',
          categoryId: 'cat-1',
          uomId: 'uom-1',
          name: 'Herbal Shampoo',
          variants: [{ sku: 'SKU-001', variantName: '250ml' }],
        },
        'user-1',
      );

      expect(res.id).toBe('prod-1');
      expect(productRepo.create).toHaveBeenCalled();
      expect(auditService.logInTransaction).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalled();
    });

    it('should fail if category does not belong to salon', async () => {
      categoryRepo.findById.mockResolvedValueOnce({ id: 'cat-1', salonId: 'other-sal' });
      await expect(
        service.createProduct(
          {
            salonId: 'sal-1',
            categoryId: 'cat-1',
            uomId: 'uom-1',
            name: 'Shampoo',
            variants: [{ sku: 'SKU-001', variantName: '250ml' }],
          },
          'user-1',
        ),
      ).rejects.toThrow();
    });
  });

  describe('updateProduct', () => {
    it('should update product and invalidate cache', async () => {
      const res = await service.updateProduct('prod-1', 'sal-1', { name: 'Updated' }, 'user-1');
      expect(res.id).toBe('prod-1');
      expect(cacheService.delete).toHaveBeenCalledWith('product:prod-1:detail');
    });
  });

  describe('archiveProduct', () => {
    it('should soft delete product and publish archive event', async () => {
      const res = await service.archiveProduct('prod-1', 'sal-1', 'user-1');
      expect(productRepo.softDelete).toHaveBeenCalledWith('prod-1');
      expect(eventBus.publish).toHaveBeenCalled();
    });
  });
});
