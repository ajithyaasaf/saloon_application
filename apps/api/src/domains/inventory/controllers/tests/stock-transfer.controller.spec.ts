import { Test, TestingModule } from '@nestjs/testing';
import { TransferStatus } from '@prisma/client';
import { InventoryOwnerController } from '../inventory-owner.controller';
import { StockTransferService } from '../../services/stock-transfer.service';
import { ProductService } from '../../services/product.service';
import { SupplierService } from '../../services/supplier.service';
import { PurchaseOrderService } from '../../services/purchase-order.service';
import { GoodsReceivedService } from '../../services/goods-received.service';
import { InventoryService } from '../../services/inventory.service';
import { StockMovementService } from '../../services/stock-movement.service';
import { StockAdjustmentService } from '../../services/stock-adjustment.service';
import { StockAuditService } from '../../services/stock-audit.service';
import { ProductUsageService } from '../../services/product-usage.service';
import { LowStockAlertService } from '../../services/low-stock-alert.service';

describe('StockTransfer Controller', () => {
  let controller: InventoryOwnerController;
  let transferService: any;

  const mockTransfer = {
    id: '11111111-1111-1111-1111-111111111111',
    transferCode: 'TRF-SAL1-0001',
    salonId: '22222222-2222-2222-2222-222222222222',
    sourceBranchId: '33333333-3333-3333-3333-333333333333',
    destinationBranchId: '44444444-4444-4444-4444-444444444444',
    status: TransferStatus.DRAFT,
  };

  beforeEach(async () => {
    transferService = {
      createTransfer: jest.fn().mockResolvedValue(mockTransfer),
      searchTransfers: jest.fn().mockResolvedValue({ data: [mockTransfer], total: 1 }),
      getTransfer: jest.fn().mockResolvedValue(mockTransfer),
      dispatchTransfer: jest.fn().mockResolvedValue({ ...mockTransfer, status: TransferStatus.DISPATCHED }),
      receiveTransfer: jest.fn().mockResolvedValue({ ...mockTransfer, status: TransferStatus.FULLY_RECEIVED }),
      cancelTransfer: jest.fn().mockResolvedValue({ ...mockTransfer, status: TransferStatus.CANCELLED }),
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
        { provide: StockTransferService, useValue: transferService },
        { provide: StockAdjustmentService, useValue: {} },
        { provide: StockAuditService, useValue: {} },
        { provide: ProductUsageService, useValue: {} },
        { provide: LowStockAlertService, useValue: {} },
      ],
    }).compile();

    controller = module.get<InventoryOwnerController>(InventoryOwnerController);
  });

  it('should create transfer', async () => {
    const dto = {
      salonId: mockTransfer.salonId,
      sourceBranchId: mockTransfer.sourceBranchId,
      destinationBranchId: mockTransfer.destinationBranchId,
      items: [{ productVariantId: '55555555-5555-5555-5555-555555555555', dispatchedQuantity: 5 }],
    };
    const res = await controller.createTransfer(dto as any, { id: 'user-1' });
    expect(res.success).toBe(true);
    expect(transferService.createTransfer).toHaveBeenCalledWith(dto, 'user-1');
  });

  it('should dispatch and receive transfer', async () => {
    await controller.dispatchTransfer(mockTransfer.id, mockTransfer.salonId, { id: 'user-1' });
    expect(transferService.dispatchTransfer).toHaveBeenCalledWith(mockTransfer.id, mockTransfer.salonId, 'user-1');

    await controller.receiveTransfer(mockTransfer.id, mockTransfer.salonId, { id: 'user-1' });
    expect(transferService.receiveTransfer).toHaveBeenCalledWith(mockTransfer.id, mockTransfer.salonId, 'user-1');
  });
});
