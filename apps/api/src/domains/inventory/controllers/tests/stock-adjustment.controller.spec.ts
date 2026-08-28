import { Test, TestingModule } from '@nestjs/testing';
import { AdjustmentReason } from '@prisma/client';
import { InventoryOwnerController } from '../inventory-owner.controller';
import { StockAdjustmentService } from '../../services/stock-adjustment.service';
import { ProductService } from '../../services/product.service';
import { SupplierService } from '../../services/supplier.service';
import { PurchaseOrderService } from '../../services/purchase-order.service';
import { GoodsReceivedService } from '../../services/goods-received.service';
import { InventoryService } from '../../services/inventory.service';
import { StockMovementService } from '../../services/stock-movement.service';
import { StockTransferService } from '../../services/stock-transfer.service';
import { StockAuditService } from '../../services/stock-audit.service';
import { ProductUsageService } from '../../services/product-usage.service';
import { LowStockAlertService } from '../../services/low-stock-alert.service';

describe('StockAdjustment Controller', () => {
  let controller: InventoryOwnerController;
  let adjustmentService: any;

  const mockAdjustment = {
    id: '11111111-1111-1111-1111-111111111111',
    adjustmentCode: 'ADJ-SAL1-0001',
    salonId: '22222222-2222-2222-2222-222222222222',
    branchId: '33333333-3333-3333-3333-333333333333',
    reason: AdjustmentReason.DAMAGE,
    status: 'PENDING_APPROVAL',
  };

  beforeEach(async () => {
    adjustmentService = {
      createAdjustment: jest.fn().mockResolvedValue(mockAdjustment),
      getAdjustment: jest.fn().mockResolvedValue(mockAdjustment),
      getAdjustmentsByBranch: jest.fn().mockResolvedValue([mockAdjustment]),
      approveAdjustment: jest.fn().mockResolvedValue({ ...mockAdjustment, status: 'APPROVED' }),
      rejectAdjustment: jest.fn().mockResolvedValue({ ...mockAdjustment, status: 'REJECTED' }),
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
        { provide: StockAdjustmentService, useValue: adjustmentService },
        { provide: StockAuditService, useValue: {} },
        { provide: ProductUsageService, useValue: {} },
        { provide: LowStockAlertService, useValue: {} },
      ],
    }).compile();

    controller = module.get<InventoryOwnerController>(InventoryOwnerController);
  });

  it('should create adjustment and submit for approval', async () => {
    const dto = {
      salonId: mockAdjustment.salonId,
      branchId: mockAdjustment.branchId,
      reason: AdjustmentReason.DAMAGE,
      items: [
        {
          productVariantId: '44444444-4444-4444-4444-444444444444',
          systemQuantity: 10,
          actualQuantity: 8,
          unitCostPrice: 100,
        },
      ],
    };
    const res = await controller.createAdjustment(dto as any, { id: 'user-1' });
    expect(res.success).toBe(true);
    expect(adjustmentService.createAdjustment).toHaveBeenCalledWith(dto, 'user-1');
  });

  it('should approve and reject adjustment', async () => {
    await controller.approveAdjustment(mockAdjustment.id, mockAdjustment.salonId, { id: 'user-1' });
    expect(adjustmentService.approveAdjustment).toHaveBeenCalledWith(mockAdjustment.id, mockAdjustment.salonId, 'user-1');

    await controller.rejectAdjustment(mockAdjustment.id, mockAdjustment.salonId, 'Rejected', { id: 'user-1' });
    expect(adjustmentService.rejectAdjustment).toHaveBeenCalledWith(mockAdjustment.id, mockAdjustment.salonId, 'Rejected', 'user-1');
  });
});
