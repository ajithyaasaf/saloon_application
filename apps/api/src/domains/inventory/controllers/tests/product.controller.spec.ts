import { Test, TestingModule } from '@nestjs/testing';
import { InventoryOwnerController } from '../inventory-owner.controller';
import { InventoryPublicController } from '../inventory-public.controller';
import { ProductService } from '../../services/product.service';
import { SupplierService } from '../../services/supplier.service';
import { PurchaseOrderService } from '../../services/purchase-order.service';
import { GoodsReceivedService } from '../../services/goods-received.service';
import { InventoryService } from '../../services/inventory.service';
import { StockMovementService } from '../../services/stock-movement.service';
import { StockTransferService } from '../../services/stock-transfer.service';
import { StockAdjustmentService } from '../../services/stock-adjustment.service';
import { StockAuditService } from '../../services/stock-audit.service';
import { ProductUsageService } from '../../services/product-usage.service';
import { LowStockAlertService } from '../../services/low-stock-alert.service';

describe('Product Controllers', () => {
  let ownerController: InventoryOwnerController;
  let publicController: InventoryPublicController;
  let productService: any;

  const mockProduct = {
    id: '11111111-1111-1111-1111-111111111111',
    salonId: '22222222-2222-2222-2222-222222222222',
    name: 'Organic Shampoo',
    slug: 'organic-shampoo',
    variants: [
      {
        id: '33333333-3333-3333-3333-333333333333',
        sku: 'SKU-001',
        variantName: '500ml',
        costPrice: 50,
        retailPrice: 100,
        professionalPrice: 80,
      },
    ],
  };

  beforeEach(async () => {
    productService = {
      createProduct: jest.fn().mockResolvedValue(mockProduct),
      searchProducts: jest.fn().mockResolvedValue({ data: [mockProduct], total: 1 }),
      getProduct: jest.fn().mockResolvedValue(mockProduct),
      updateProduct: jest.fn().mockResolvedValue({ ...mockProduct, name: 'Updated Shampoo' }),
      archiveProduct: jest.fn().mockResolvedValue({ ...mockProduct, isActive: false }),
      restoreProduct: jest.fn().mockResolvedValue({ ...mockProduct, isActive: true }),
      createVariant: jest.fn().mockResolvedValue(mockProduct.variants[0]),
      updateVariant: jest.fn().mockResolvedValue(mockProduct.variants[0]),
      getVariant: jest.fn().mockResolvedValue(mockProduct.variants[0]),
      archiveVariant: jest.fn().mockResolvedValue(mockProduct.variants[0]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryOwnerController, InventoryPublicController],
      providers: [
        { provide: ProductService, useValue: productService },
        { provide: SupplierService, useValue: {} },
        { provide: PurchaseOrderService, useValue: {} },
        { provide: GoodsReceivedService, useValue: {} },
        { provide: InventoryService, useValue: {} },
        { provide: StockMovementService, useValue: {} },
        { provide: StockTransferService, useValue: {} },
        { provide: StockAdjustmentService, useValue: {} },
        { provide: StockAuditService, useValue: {} },
        { provide: ProductUsageService, useValue: {} },
        { provide: LowStockAlertService, useValue: {} },
      ],
    }).compile();

    ownerController = module.get<InventoryOwnerController>(InventoryOwnerController);
    publicController = module.get<InventoryPublicController>(InventoryPublicController);
  });

  describe('Public Controller', () => {
    it('should return sanitized products without cost prices', async () => {
      const response = await publicController.getPublicProducts({ page: 1, limit: 10 });
      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(1);
      expect(response.data[0]?.variants?.[0]?.costPrice).toBeUndefined();
      expect(response.data[0]?.variants?.[0]?.professionalPrice).toBeUndefined();
      expect(productService.searchProducts).toHaveBeenCalled();
    });

    it('should return single public product without internal costs', async () => {
      const response = await publicController.getPublicProduct(mockProduct.id, mockProduct.salonId);
      expect(response.success).toBe(true);
      expect(response.data?.variants?.[0]?.costPrice).toBeUndefined();
      expect(productService.getProduct).toHaveBeenCalledWith(mockProduct.id, mockProduct.salonId);
    });
  });

  describe('Owner Controller', () => {
    it('should create product delegating to ProductService', async () => {
      const dto = {
        salonId: mockProduct.salonId,
        categoryId: '44444444-4444-4444-4444-444444444444',
        uomId: '55555555-5555-5555-5555-555555555555',
        name: 'Organic Shampoo',
        variants: [{ sku: 'SKU-001', variantName: '500ml' }],
      };
      const response = await ownerController.createProduct(dto as any, { id: 'user-1' });
      expect(response.success).toBe(true);
      expect(productService.createProduct).toHaveBeenCalledWith(dto, 'user-1');
    });

    it('should update product delegating to ProductService', async () => {
      const response = await ownerController.updateProduct(
        mockProduct.id,
        mockProduct.salonId,
        { name: 'Updated Shampoo' },
        { id: 'user-1' },
      );
      expect(response.success).toBe(true);
      expect(productService.updateProduct).toHaveBeenCalledWith(
        mockProduct.id,
        mockProduct.salonId,
        { name: 'Updated Shampoo' },
        'user-1',
      );
    });

    it('should archive and restore product', async () => {
      await ownerController.archiveProduct(mockProduct.id, mockProduct.salonId, { id: 'user-1' });
      expect(productService.archiveProduct).toHaveBeenCalledWith(mockProduct.id, mockProduct.salonId, 'user-1');

      await ownerController.restoreProduct(mockProduct.id, mockProduct.salonId, { id: 'user-1' });
      expect(productService.restoreProduct).toHaveBeenCalledWith(mockProduct.id, mockProduct.salonId, 'user-1');
    });
  });
});
