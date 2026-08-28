import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseOrderStatus } from '@prisma/client';
import { InventoryOwnerController } from '../inventory-owner.controller';
import { PurchaseOrderService } from '../../services/purchase-order.service';
import { ProductService } from '../../services/product.service';
import { SupplierService } from '../../services/supplier.service';
import { GoodsReceivedService } from '../../services/goods-received.service';
import { InventoryService } from '../../services/inventory.service';
import { StockMovementService } from '../../services/stock-movement.service';
import { StockTransferService } from '../../services/stock-transfer.service';
import { StockAdjustmentService } from '../../services/stock-adjustment.service';
import { StockAuditService } from '../../services/stock-audit.service';
import { ProductUsageService } from '../../services/product-usage.service';
import { LowStockAlertService } from '../../services/low-stock-alert.service';

describe('PurchaseOrder Controller', () => {
  let controller: InventoryOwnerController;
  let poService: any;

  const mockPO = {
    id: '11111111-1111-1111-1111-111111111111',
    poCode: 'PO-SAL1-0001',
    salonId: '22222222-2222-2222-2222-222222222222',
    branchId: '33333333-3333-3333-3333-333333333333',
    supplierId: '44444444-4444-4444-4444-444444444444',
    status: PurchaseOrderStatus.DRAFT,
    totalAmount: 5000,
  };

  beforeEach(async () => {
    poService = {
      createPurchaseOrder: jest.fn().mockResolvedValue(mockPO),
      searchPurchaseOrders: jest.fn().mockResolvedValue({ data: [mockPO], total: 1 }),
      getPurchaseOrder: jest.fn().mockResolvedValue(mockPO),
      updatePurchaseOrder: jest.fn().mockResolvedValue(mockPO),
      submitPurchaseOrder: jest.fn().mockResolvedValue({ ...mockPO, status: PurchaseOrderStatus.SUBMITTED }),
      approvePurchaseOrder: jest.fn().mockResolvedValue({ ...mockPO, status: PurchaseOrderStatus.APPROVED }),
      rejectPurchaseOrder: jest.fn().mockResolvedValue({ ...mockPO, status: PurchaseOrderStatus.REJECTED }),
      cancelPurchaseOrder: jest.fn().mockResolvedValue({ ...mockPO, status: PurchaseOrderStatus.CANCELLED }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryOwnerController],
      providers: [
        { provide: ProductService, useValue: {} },
        { provide: SupplierService, useValue: {} },
        { provide: PurchaseOrderService, useValue: poService },
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

    controller = module.get<InventoryOwnerController>(InventoryOwnerController);
  });

  it('should create purchase order delegating to PurchaseOrderService', async () => {
    const dto = {
      salonId: mockPO.salonId,
      branchId: mockPO.branchId,
      supplierId: mockPO.supplierId,
      items: [{ productVariantId: '55555555-5555-5555-5555-555555555555', orderedQuantity: 10, unitCostPrice: 500 }],
    };
    const res = await controller.createPurchaseOrder(dto as any, { id: 'user-1' });
    expect(res.success).toBe(true);
    expect(poService.createPurchaseOrder).toHaveBeenCalledWith(dto, 'user-1');
  });

  it('should submit, approve, and cancel purchase order', async () => {
    await controller.submitPurchaseOrder(mockPO.id, mockPO.salonId, { id: 'user-1' });
    expect(poService.submitPurchaseOrder).toHaveBeenCalledWith(mockPO.id, mockPO.salonId, 'user-1');

    await controller.approvePurchaseOrder(mockPO.id, mockPO.salonId, { id: 'user-1' });
    expect(poService.approvePurchaseOrder).toHaveBeenCalledWith(mockPO.id, mockPO.salonId, 'user-1');

    await controller.cancelPurchaseOrder(mockPO.id, mockPO.salonId, 'Cancelled', { id: 'user-1' });
    expect(poService.cancelPurchaseOrder).toHaveBeenCalledWith(mockPO.id, mockPO.salonId, 'Cancelled', 'user-1');
  });
});
