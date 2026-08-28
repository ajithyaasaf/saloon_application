import { Test, TestingModule } from '@nestjs/testing';
import { InventoryOwnerController } from '../inventory-owner.controller';
import { SupplierService } from '../../services/supplier.service';
import { ProductService } from '../../services/product.service';
import { PurchaseOrderService } from '../../services/purchase-order.service';
import { GoodsReceivedService } from '../../services/goods-received.service';
import { InventoryService } from '../../services/inventory.service';
import { StockMovementService } from '../../services/stock-movement.service';
import { StockTransferService } from '../../services/stock-transfer.service';
import { StockAdjustmentService } from '../../services/stock-adjustment.service';
import { StockAuditService } from '../../services/stock-audit.service';
import { ProductUsageService } from '../../services/product-usage.service';
import { LowStockAlertService } from '../../services/low-stock-alert.service';

describe('Supplier Controller', () => {
  let controller: InventoryOwnerController;
  let supplierService: any;

  const mockSupplier = {
    id: '11111111-1111-1111-1111-111111111111',
    salonId: '22222222-2222-2222-2222-222222222222',
    code: 'SUP-001',
    name: 'Cosmetics Depot Ltd',
    leadTimeDays: 5,
    status: 'ACTIVE',
  };

  const mockContact = {
    id: '33333333-3333-3333-3333-333333333333',
    supplierId: mockSupplier.id,
    contactName: 'Alice Green',
    email: 'alice@example.com',
    isPrimary: true,
  };

  beforeEach(async () => {
    supplierService = {
      createSupplier: jest.fn().mockResolvedValue(mockSupplier),
      searchSuppliers: jest.fn().mockResolvedValue({ data: [mockSupplier], total: 1 }),
      getSupplier: jest.fn().mockResolvedValue(mockSupplier),
      updateSupplier: jest.fn().mockResolvedValue({ ...mockSupplier, name: 'Updated Depot' }),
      archiveSupplier: jest.fn().mockResolvedValue({ ...mockSupplier, status: 'INACTIVE' }),
      addSupplierContact: jest.fn().mockResolvedValue(mockContact),
      updateSupplierContact: jest.fn().mockResolvedValue({ ...mockContact, contactName: 'Alice Smith' }),
      removeSupplierContact: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryOwnerController],
      providers: [
        { provide: ProductService, useValue: {} },
        { provide: SupplierService, useValue: supplierService },
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

    controller = module.get<InventoryOwnerController>(InventoryOwnerController);
  });

  it('should create supplier via SupplierService', async () => {
    const dto = {
      salonId: mockSupplier.salonId,
      code: 'SUP-001',
      name: 'Cosmetics Depot Ltd',
    };
    const res = await controller.createSupplier(dto as any, { id: 'user-1' });
    expect(res.success).toBe(true);
    expect(supplierService.createSupplier).toHaveBeenCalledWith(dto, 'user-1');
  });

  it('should search suppliers with pagination', async () => {
    const res = await controller.searchSuppliers({ page: 1, limit: 10 });
    expect(res.success).toBe(true);
    expect(supplierService.searchSuppliers).toHaveBeenCalled();
  });

  it('should add contact to supplier', async () => {
    const res = await controller.addSupplierContact(mockSupplier.id, mockSupplier.salonId, mockContact as any);
    expect(res.success).toBe(true);
    expect(supplierService.addSupplierContact).toHaveBeenCalledWith(mockSupplier.id, mockSupplier.salonId, mockContact);
  });

  it('should remove contact from supplier', async () => {
    const res = await controller.removeSupplierContact(mockContact.id, mockSupplier.id, mockSupplier.salonId);
    expect(res.success).toBe(true);
    expect(supplierService.removeSupplierContact).toHaveBeenCalledWith(mockContact.id, mockSupplier.id, mockSupplier.salonId);
  });
});
