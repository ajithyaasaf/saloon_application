import { Test, TestingModule } from '@nestjs/testing';
import { AlertStatus } from '@prisma/client';
import { InventoryOwnerController } from '../inventory-owner.controller';
import { LowStockAlertService } from '../../services/low-stock-alert.service';
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

describe('LowStockAlert Controller', () => {
  let controller: InventoryOwnerController;
  let alertService: any;

  const mockAlert = {
    id: '11111111-1111-1111-1111-111111111111',
    salonId: '22222222-2222-2222-2222-222222222222',
    branchId: '33333333-3333-3333-3333-333333333333',
    productVariantId: '44444444-4444-4444-4444-444444444444',
    currentQuantity: 2,
    reorderPoint: 10,
    alertStatus: AlertStatus.ACTIVE,
  };

  beforeEach(async () => {
    alertService = {
      getActiveAlerts: jest.fn().mockResolvedValue([mockAlert]),
      evaluateStockLevel: jest.fn().mockResolvedValue(mockAlert),
      acknowledgeAlert: jest.fn().mockResolvedValue({ ...mockAlert, alertStatus: AlertStatus.ACKNOWLEDGED }),
      resolveAlert: jest.fn().mockResolvedValue({ ...mockAlert, alertStatus: AlertStatus.RESOLVED }),
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
        { provide: ProductUsageService, useValue: {} },
        { provide: LowStockAlertService, useValue: alertService },
      ],
    }).compile();

    controller = module.get<InventoryOwnerController>(InventoryOwnerController);
  });

  it('should get active alerts for branch', async () => {
    const res = await controller.getActiveAlerts(mockAlert.branchId);
    expect(res.success).toBe(true);
    expect(alertService.getActiveAlerts).toHaveBeenCalledWith(mockAlert.branchId);
  });

  it('should evaluate stock level', async () => {
    const res = await controller.evaluateStock(mockAlert.branchId, mockAlert.productVariantId, { id: 'user-1' });
    expect(res.success).toBe(true);
    expect(alertService.evaluateStockLevel).toHaveBeenCalledWith(mockAlert.branchId, mockAlert.productVariantId, 'user-1');
  });

  it('should acknowledge and resolve alert', async () => {
    await controller.acknowledgeAlert(mockAlert.id, mockAlert.salonId, { id: 'user-1' });
    expect(alertService.acknowledgeAlert).toHaveBeenCalledWith(mockAlert.id, mockAlert.salonId, 'user-1');

    await controller.resolveAlert(mockAlert.id, mockAlert.salonId, { id: 'user-1' });
    expect(alertService.resolveAlert).toHaveBeenCalledWith(mockAlert.id, mockAlert.salonId, 'user-1');
  });
});
