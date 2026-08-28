import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ProductRepository, ProductVariantRepository } from '../repositories/product.repository';

describe('ProductRepository & ProductVariantRepository', () => {
  let productRepo: ProductRepository;
  let variantRepo: ProductVariantRepository;
  let db: any;

  const mockProduct = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    salonId: 'sal_1',
    categoryId: 'cat_1',
    uomId: 'uom_1',
    name: "L'Oréal Shampoo",
    slug: 'loreal-shampoo-12345',
    productType: 'RETAIL',
    isActive: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockVariant = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    productId: '123e4567-e89b-12d3-a456-426614174000',
    sku: 'SKU-SHAMPOO-500ML',
    barcode: '8901234567890',
    variantName: '500ml',
    costPrice: 50000,
    retailPrice: 80000,
    isActive: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    db = {
      product: {
        findFirst: jest.fn().mockResolvedValue(mockProduct),
        findMany: jest.fn().mockResolvedValue([mockProduct]),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue(mockProduct),
        update: jest.fn().mockResolvedValue(mockProduct),
      },
      productVariant: {
        findFirst: jest.fn().mockResolvedValue(mockVariant),
        findMany: jest.fn().mockResolvedValue([mockVariant]),
        create: jest.fn().mockResolvedValue(mockVariant),
        update: jest.fn().mockResolvedValue(mockVariant),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductRepository,
        ProductVariantRepository,
        { provide: PrismaService, useValue: db },
      ],
    }).compile();

    productRepo = module.get<ProductRepository>(ProductRepository);
    variantRepo = module.get<ProductVariantRepository>(ProductVariantRepository);
  });

  describe('ProductRepository', () => {
    it('should find product by ID', async () => {
      const res = await productRepo.findById('123e4567-e89b-12d3-a456-426614174000');
      expect(res).toEqual(mockProduct);
      expect(db.product.findFirst).toHaveBeenCalledWith({
        where: { id: '123e4567-e89b-12d3-a456-426614174000', deletedAt: null },
        include: { variants: { where: { deletedAt: null } }, brand: true, category: true, uom: true },
      });
    });

    it('should search products with pagination', async () => {
      const res = await productRepo.search({ page: 1, limit: 10, search: 'Loreal' });
      expect(res.data).toHaveLength(1);
      expect(res.total).toBe(1);
    });

    it('should soft delete product', async () => {
      await productRepo.softDelete('123e4567-e89b-12d3-a456-426614174000');
      expect(db.product.update).toHaveBeenCalled();
    });
  });

  describe('ProductVariantRepository', () => {
    it('should find variant by SKU', async () => {
      const res = await variantRepo.findBySku('prod_1', 'SKU-SHAMPOO-500ML');
      expect(res).toEqual(mockVariant);
    });

    it('should find variant by Barcode', async () => {
      const res = await variantRepo.findByBarcode('8901234567890');
      expect(res).toEqual(mockVariant);
    });
  });
});
