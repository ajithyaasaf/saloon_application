import { Test, TestingModule } from '@nestjs/testing';
import { StockMovementType } from '@prisma/client';
import { InventoryOwnerController } from '../inventory-owner.controller';
import { InventoryService } from '../../services/inventory.service';
import { ProductService } from '../../services/product.service';
import { SupplierService } from '../../services/supplier.service';
import { PurchaseOrderService } from '../../services/purchase-order.service';
import { GoodsReceivedService } from '../../services/goods-received.service';
import { StockMovementService } from '../../services/stock-movement.service';
import { StockTransferService } from '../../services/stock-transfer.service';
import { StockAdjustmentService } from '../../services/stock-adjustment.service';
import { StockAuditService } from '../../services/stock-audit.service';
import { ProductUsageService } from '../../services/product-usage.service';
import { LowStockAlertService } from '../../services/low-stock-alert.service';

describe('Inventory Stock Controller', () => {
  let controller: InventoryOwnerController;
  let inventoryService: any;

  const mockStock = {
    id: '11111111-1111-1111-1111-111111111111',
    salonId: '22222222-2222-2222-2222-222222222222',
    branchId: '33333333-3333-3333-3333-333333333333',
    productVariantId: '44444444-4444-4444-4444-444444444444',
    batchNumber: 'DEFAULT_BATCH',
    quantityOnHand: 100,
    quantityReserved: 10,
    quantityAvailable: 90,
  };

  beforeEach(async () => {
    inventoryService = {
      searchInventory: jest.fn().mockResolvedValue({ data: [mockStock], total: 1 }),
      getStock: jest.fn().mockResolvedValue(mockStock),
      getStockByVariant: jest.fn().mockResolvedValue(mockStock),
      getLowStock: jest.fn().mockResolvedValue([mockStock]),
      getExpiringStock: jest.fn().mockResolvedValue([mockStock]),
      checkAvailability: jest.fn().mockResolvedValue(true),
      reserveStock: jest.fn().mockResolvedValue({ ...mockStock, quantityReserved: 15 }),
      releaseReservation: jest.fn().mockResolvedValue({ ...mockStock, quantityReserved: 5 }),
      increaseStock: jest.fn().mockResolvedValue({ ...mockStock, quantityOnHand: 110 }),
      decreaseStock: jest.fn().mockResolvedValue({ ...mockStock, quantityOnHand: 90 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryOwnerController],
      providers: [
        { provide: ProductService, useValue: {} },
        { provide: SupplierService, useValue: {} },
        { provide: PurchaseOrderService, useValue: {} },
        { provide: GoodsReceivedService, useValue: {} },
        { provide: InventoryService, useValue: inventoryService },
        { provide: StockMovementService, useValue: {} },
        { provide: StockTransferService, useValue: {} },
        { provide: StockAdjustmentService, useValue: {} },
        { provide: StockAuditService, useValue: {} },
        { provide: ProductUsageService, useValue: {} },
        { provide: LowStockAlertService, useValue: {} },
      ],
    }).compile();

    controller = module.get<InventoryOwnerController>(InventoryOwnerController);
  });

  it('should search stock with pagination', async () => {
    const res = await controller.searchStock({ page: 1, limit: 10 });
    expect(res.success).toBe(true);
    expect(inventoryService.searchInventory).toHaveBeenCalled();
  });

  it('should reserve and release stock', async () => {
    const resReserve = await controller.reserveStock(mockStock.branchId, mockStock.productVariantId, 5, 'DEFAULT_BATCH', { id: 'user-1' });
    expect(resReserve.success).toBe(true);
    expect(inventoryService.reserveStock).toHaveBeenCalledWith(mockStock.branchId, mockStock.productVariantId, 'DEFAULT_BATCH', 5, 'user-1');

    const resRelease = await controller.releaseStock(mockStock.branchId, mockStock.productVariantId, 5, 'DEFAULT_BATCH', { id: 'user-1' });
    expect(resRelease.success).toBe(true);
    expect(inventoryService.releaseReservation).toHaveBeenCalledWith(mockStock.branchId, mockStock.productVariantId, 'DEFAULT_BATCH', 5, 'user-1');
  });

  it('should increase and decrease stock', async () => {
    await controller.increaseStock(mockStock.salonId, mockStock.branchId, mockStock.productVariantId, 10, 100, StockMovementType.PURCHASE_RECEIPT, 'DEFAULT_BATCH', { id: 'user-1' });
    expect(inventoryService.increaseStock).toHaveBeenCalled();

    await controller.decreaseStock(mockStock.salonId, mockStock.branchId, mockStock.productVariantId, 10, StockMovementType.INTERNAL_USE, 'DEFAULT_BATCH', { id: 'user-1' });
    expect(inventoryService.decreaseStock).toHaveBeenCalled();
  });
});
