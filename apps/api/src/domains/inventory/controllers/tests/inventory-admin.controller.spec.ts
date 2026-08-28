import { Test, TestingModule } from '@nestjs/testing';
import { InventoryAdminController } from '../inventory-admin.controller';
import { InventoryService } from '../../services/inventory.service';
import { StockMovementService } from '../../services/stock-movement.service';
import { PurchaseOrderService } from '../../services/purchase-order.service';
import { StockTransferService } from '../../services/stock-transfer.service';
import { StockAuditService } from '../../services/stock-audit.service';
import { LowStockAlertService } from '../../services/low-stock-alert.service';

describe('InventoryAdmin Controller', () => {
  let controller: InventoryAdminController;
  let inventoryService: any;
  let movementService: any;
  let poService: any;
  let transferService: any;
  let auditService: any;
  let alertService: any;

  beforeEach(async () => {
    inventoryService = {
      searchInventory: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    };
    movementService = {
      searchMovements: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    };
    poService = {
      searchPurchaseOrders: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    };
    transferService = {
      searchTransfers: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    };
    auditService = {
      searchAudits: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    };
    alertService = {
      getActiveAlerts: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryAdminController],
      providers: [
        { provide: InventoryService, useValue: inventoryService },
        { provide: StockMovementService, useValue: movementService },
        { provide: PurchaseOrderService, useValue: poService },
        { provide: StockTransferService, useValue: transferService },
        { provide: StockAuditService, useValue: auditService },
        { provide: LowStockAlertService, useValue: alertService },
      ],
    }).compile();

    controller = module.get<InventoryAdminController>(InventoryAdminController);
  });

  it('should return platform inventory statistics', async () => {
    const res = await controller.getStatistics();
    expect(res.success).toBe(true);
    expect(res.data.totalTrackedSkus).toBeGreaterThan(0);
    expect(res.data.totalInventoryValuation).toBeGreaterThan(0);
  });

  it('should search platform inventory stock', async () => {
    const res = await controller.searchStock({ page: 1, limit: 10 });
    expect(res.success).toBe(true);
    expect(inventoryService.searchInventory).toHaveBeenCalled();
  });

  it('should search platform stock movements', async () => {
    const res = await controller.searchMovements({ page: 1, limit: 10 });
    expect(res.success).toBe(true);
    expect(movementService.searchMovements).toHaveBeenCalled();
  });

  it('should search platform purchase orders, transfers, and audits', async () => {
    await controller.searchPurchaseOrders('sal-1');
    expect(poService.searchPurchaseOrders).toHaveBeenCalled();

    await controller.searchTransfers({ page: 1, limit: 10 });
    expect(transferService.searchTransfers).toHaveBeenCalled();

    await controller.searchAudits({ page: 1, limit: 10 });
    expect(auditService.searchAudits).toHaveBeenCalled();

    await controller.getAlerts('br-1');
    expect(alertService.getActiveAlerts).toHaveBeenCalledWith('br-1');
  });
});
