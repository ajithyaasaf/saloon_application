import { Test, TestingModule } from '@nestjs/testing';
import { GRNStatus } from '@prisma/client';
import { InventoryOwnerController } from '../inventory-owner.controller';
import { GoodsReceivedService } from '../../services/goods-received.service';
import { ProductService } from '../../services/product.service';
import { SupplierService } from '../../services/supplier.service';
import { PurchaseOrderService } from '../../services/purchase-order.service';
import { InventoryService } from '../../services/inventory.service';
import { StockMovementService } from '../../services/stock-movement.service';
import { StockTransferService } from '../../services/stock-transfer.service';
import { StockAdjustmentService } from '../../services/stock-adjustment.service';
import { StockAuditService } from '../../services/stock-audit.service';
import { ProductUsageService } from '../../services/product-usage.service';
import { LowStockAlertService } from '../../services/low-stock-alert.service';

describe('GoodsReceived Controller', () => {
  let controller: InventoryOwnerController;
  let grnService: any;

  const mockGRN = {
    id: '11111111-1111-1111-1111-111111111111',
    grnCode: 'GRN-SAL1-0001',
    salonId: '22222222-2222-2222-2222-222222222222',
    branchId: '33333333-3333-3333-3333-333333333333',
    purchaseOrderId: '44444444-4444-4444-4444-444444444444',
    status: GRNStatus.RECEIVED,
  };

  beforeEach(async () => {
    grnService = {
      receiveGoods: jest.fn().mockResolvedValue(mockGRN),
      getGRN: jest.fn().mockResolvedValue(mockGRN),
      getGRNsByPurchaseOrder: jest.fn().mockResolvedValue([mockGRN]),
      verifyGRN: jest.fn().mockResolvedValue({ ...mockGRN, status: GRNStatus.VERIFIED }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryOwnerController],
      providers: [
        { provide: ProductService, useValue: {} },
        { provide: SupplierService, useValue: {} },
        { provide: PurchaseOrderService, useValue: {} },
        { provide: GoodsReceivedService, useValue: grnService },
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

  it('should receive goods and delegate to GoodsReceivedService', async () => {
    const dto = {
      salonId: mockGRN.salonId,
      branchId: mockGRN.branchId,
      purchaseOrderId: mockGRN.purchaseOrderId,
      supplierId: '55555555-5555-5555-5555-555555555555',
      items: [
        {
          purchaseOrderItemId: '66666666-6666-6666-6666-666666666666',
          productVariantId: '77777777-7777-7777-7777-777777777777',
          receivedQuantity: 10,
          acceptedQuantity: 10,
          unitCostPrice: 500,
        },
      ],
    };
    const res = await controller.receiveGoods(dto as any, { id: 'user-1' });
    expect(res.success).toBe(true);
    expect(grnService.receiveGoods).toHaveBeenCalledWith(dto, 'user-1');
  });

  it('should verify GRN', async () => {
    const res = await controller.verifyGRN(mockGRN.id, mockGRN.salonId, { id: 'user-1' });
    expect(res.success).toBe(true);
    expect(grnService.verifyGRN).toHaveBeenCalledWith(mockGRN.id, mockGRN.salonId, 'user-1');
  });
});
