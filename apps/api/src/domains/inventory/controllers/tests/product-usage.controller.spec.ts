import { Test, TestingModule } from '@nestjs/testing';
import { ProductUsageType } from '@prisma/client';
import { InventoryOwnerController } from '../inventory-owner.controller';
import { ProductUsageService } from '../../services/product-usage.service';
import { ProductService } from '../../services/product.service';
import { SupplierService } from '../../services/supplier.service';
import { PurchaseOrderService } from '../../services/purchase-order.service';
import { GoodsReceivedService } from '../../services/goods-received.service';
import { InventoryService } from '../../services/inventory.service';
import { StockMovementService } from '../../services/stock-movement.service';
import { StockTransferService } from '../../services/stock-transfer.service';
import { StockAdjustmentService } from '../../services/stock-adjustment.service';
import { StockAuditService } from '../../services/stock-audit.service';
import { LowStockAlertService } from '../../services/low-stock-alert.service';

describe('ProductUsage Controller', () => {
  let controller: InventoryOwnerController;
  let usageService: any;

  const mockUsage = {
    id: '11111111-1111-1111-1111-111111111111',
    usageCode: 'USG-SAL1-0001',
    salonId: '22222222-2222-2222-2222-222222222222',
    branchId: '33333333-3333-3333-3333-333333333333',
    productVariantId: '44444444-4444-4444-4444-444444444444',
    quantity: 2,
    usageType: ProductUsageType.SERVICE_CONSUMPTION,
  };

  beforeEach(async () => {
    usageService = {
      recordUsage: jest.fn().mockResolvedValue(mockUsage),
      getUsage: jest.fn().mockResolvedValue(mockUsage),
      getUsageByProduct: jest.fn().mockResolvedValue([mockUsage]),
      getUsageByBranch: jest.fn().mockResolvedValue([mockUsage]),
      getUsageByReference: jest.fn().mockResolvedValue([mockUsage]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryOwnerController],
      providers: [
        { provide: ProductService, useValue: {} },
        { provide: SupplierService, useValue: {} },
        { provide: PurchaseOrderService, useValue: {} },
        { provide: GoodsReceivedService, useValue: {} },
        { provide: InventoryService, useValue: {} },
        { provide: StockMovementService, useValue: {} },
        { provide: StockTransferService, useValue: {} },
        { provide: StockAdjustmentService, useValue: {} },
        { provide: StockAuditService, useValue: {} },
        { provide: ProductUsageService, useValue: usageService },
        { provide: LowStockAlertService, useValue: {} },
      ],
    }).compile();

    controller = module.get<InventoryOwnerController>(InventoryOwnerController);
  });

  it('should record product usage', async () => {
    const dto = {
      salonId: mockUsage.salonId,
      branchId: mockUsage.branchId,
      productVariantId: mockUsage.productVariantId,
      quantity: 2,
      usageType: ProductUsageType.SERVICE_CONSUMPTION,
    };
    const res = await controller.recordUsage(dto as any, { id: 'user-1' });
    expect(res.success).toBe(true);
    expect(usageService.recordUsage).toHaveBeenCalledWith(dto, 'user-1');
  });

  it('should get usage records by product, branch, and reference', async () => {
    const resProd = await controller.getUsageByProduct(mockUsage.productVariantId);
    expect(resProd.success).toBe(true);
    expect(usageService.getUsageByProduct).toHaveBeenCalledWith(mockUsage.productVariantId);

    const resBranch = await controller.getUsageByBranch(mockUsage.branchId);
    expect(resBranch.success).toBe(true);
    expect(usageService.getUsageByBranch).toHaveBeenCalledWith(mockUsage.branchId);

    const resRef = await controller.getUsageByReference('Appointment', 'app-1');
    expect(resRef.success).toBe(true);
    expect(usageService.getUsageByReference).toHaveBeenCalledWith('Appointment', 'app-1');
  });
});
