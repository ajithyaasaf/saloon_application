import { Test, TestingModule } from '@nestjs/testing';
import { AuditStatus } from '@prisma/client';
import { InventoryOwnerController } from '../inventory-owner.controller';
import { StockAuditService } from '../../services/stock-audit.service';
import { ProductService } from '../../services/product.service';
import { SupplierService } from '../../services/supplier.service';
import { PurchaseOrderService } from '../../services/purchase-order.service';
import { GoodsReceivedService } from '../../services/goods-received.service';
import { InventoryService } from '../../services/inventory.service';
import { StockMovementService } from '../../services/stock-movement.service';
import { StockTransferService } from '../../services/stock-transfer.service';
import { StockAdjustmentService } from '../../services/stock-adjustment.service';
import { ProductUsageService } from '../../services/product-usage.service';
import { LowStockAlertService } from '../../services/low-stock-alert.service';

describe('StockAudit Controller', () => {
  let controller: InventoryOwnerController;
  let auditService: any;

  const mockAudit = {
    id: '11111111-1111-1111-1111-111111111111',
    auditCode: 'AUD-SAL1-0001',
    salonId: '22222222-2222-2222-2222-222222222222',
    branchId: '33333333-3333-3333-3333-333333333333',
    status: AuditStatus.PLANNED,
  };

  beforeEach(async () => {
    auditService = {
      createAudit: jest.fn().mockResolvedValue(mockAudit),
      searchAudits: jest.fn().mockResolvedValue({ data: [mockAudit], total: 1 }),
      getAudit: jest.fn().mockResolvedValue(mockAudit),
      startAudit: jest.fn().mockResolvedValue({ ...mockAudit, status: AuditStatus.IN_PROGRESS }),
      completeAudit: jest.fn().mockResolvedValue({ ...mockAudit, status: AuditStatus.COMPLETED }),
      cancelAudit: jest.fn().mockResolvedValue({ ...mockAudit, status: AuditStatus.CANCELLED }),
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
        { provide: StockAuditService, useValue: auditService },
        { provide: ProductUsageService, useValue: {} },
        { provide: LowStockAlertService, useValue: {} },
      ],
    }).compile();

    controller = module.get<InventoryOwnerController>(InventoryOwnerController);
  });

  it('should create audit', async () => {
    const dto = {
      salonId: mockAudit.salonId,
      branchId: mockAudit.branchId,
      items: [{ productVariantId: '44444444-4444-4444-4444-444444444444', expectedQuantity: 10, countedQuantity: 12, unitCostPrice: 50 }],
    };
    const res = await controller.createAudit(dto as any, { id: 'user-1' });
    expect(res.success).toBe(true);
    expect(auditService.createAudit).toHaveBeenCalledWith(dto, 'user-1');
  });

  it('should start, complete, and cancel audit', async () => {
    await controller.startAudit(mockAudit.id, mockAudit.salonId, { id: 'user-1' });
    expect(auditService.startAudit).toHaveBeenCalledWith(mockAudit.id, mockAudit.salonId, 'user-1');

    await controller.completeAudit(mockAudit.id, mockAudit.salonId, { id: 'user-1' });
    expect(auditService.completeAudit).toHaveBeenCalledWith(mockAudit.id, mockAudit.salonId, 'user-1');

    await controller.cancelAudit(mockAudit.id, mockAudit.salonId, { id: 'user-1' });
    expect(auditService.cancelAudit).toHaveBeenCalledWith(mockAudit.id, mockAudit.salonId, 'user-1');
  });
});
