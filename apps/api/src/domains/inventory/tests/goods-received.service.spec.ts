import { Test, TestingModule } from '@nestjs/testing';
import { GRNStatus, PurchaseOrderStatus } from '@prisma/client';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { InventoryStockRepository } from '../repositories/inventory-stock.repository';
import { GoodsReceivedNoteRepository, PurchaseOrderItemRepository, PurchaseOrderRepository } from '../repositories/purchase-order.repository';
import { StockMovementRepository } from '../repositories/stock-movement.repository';
import { GoodsReceivedService } from '../services/goods-received.service';

describe('GoodsReceivedService', () => {
  let service: GoodsReceivedService;
  let grnRepo: any;
  let poRepo: any;
  let poItemRepo: any;
  let stockRepo: any;
  let movementRepo: any;
  let txService: any;
  let auditService: any;
  let cacheService: any;
  let eventBus: any;

  const mockPO = {
    id: 'po-1',
    salonId: 'sal-1',
    branchId: 'br-1',
    status: PurchaseOrderStatus.APPROVED,
  };

  const mockPOItem = {
    id: 'poi-1',
    purchaseOrderId: 'po-1',
    productVariantId: 'var-1',
    orderedQuantity: 10,
    receivedQuantity: 0,
  };

  const mockGRN = {
    id: 'grn-1',
    grnCode: 'GRN-SAL1-0001',
    purchaseOrderId: 'po-1',
    salonId: 'sal-1',
    branchId: 'br-1',
    status: GRNStatus.RECEIVED,
  };

  const mockStock = {
    id: 'stock-1',
    productVariantId: 'var-1',
    quantityOnHand: 10,
  };

  beforeEach(async () => {
    grnRepo = {
      create: jest.fn().mockResolvedValue(mockGRN),
      findById: jest.fn().mockResolvedValue(mockGRN),
      findByPurchaseOrder: jest.fn().mockResolvedValue([mockGRN]),
    };

    poRepo = {
      findById: jest.fn().mockResolvedValue(mockPO),
      update: jest.fn().mockResolvedValue(mockPO),
    };

    poItemRepo = {
      findByPurchaseOrder: jest.fn().mockResolvedValue([mockPOItem]),
      updateReceivedQuantity: jest.fn().mockResolvedValue({ ...mockPOItem, receivedQuantity: 10 }),
    };

    stockRepo = {
      findByVariant: jest.fn().mockResolvedValue(null),
      upsertStock: jest.fn().mockResolvedValue(mockStock),
    };

    movementRepo = {
      create: jest.fn().mockResolvedValue({ id: 'mov-1' }),
    };

    txService = {
      run: jest.fn().mockImplementation((cb) => cb({})),
    };

    auditService = {
      logInTransaction: jest.fn().mockResolvedValue(undefined),
    };

    cacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    eventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoodsReceivedService,
        { provide: GoodsReceivedNoteRepository, useValue: grnRepo },
        { provide: PurchaseOrderRepository, useValue: poRepo },
        { provide: PurchaseOrderItemRepository, useValue: poItemRepo },
        { provide: InventoryStockRepository, useValue: stockRepo },
        { provide: StockMovementRepository, useValue: movementRepo },
        { provide: TransactionService, useValue: txService },
        { provide: AuditService, useValue: auditService },
        { provide: CacheService, useValue: cacheService },
        { provide: EventBusService, useValue: eventBus },
      ],
    }).compile();

    service = module.get<GoodsReceivedService>(GoodsReceivedService);
  });

  describe('receiveGoods', () => {
    it('should receive goods, update stock, create movements, and update PO status', async () => {
      const res = await service.receiveGoods(
        {
          salonId: 'sal-1',
          branchId: 'br-1',
          purchaseOrderId: 'po-1',
          supplierId: 'sup-1',
          items: [
            {
              purchaseOrderItemId: 'poi-1',
              productVariantId: 'var-1',
              receivedQuantity: 10,
              acceptedQuantity: 10,
              unitCostPrice: 100,
            },
          ],
        },
        'user-1',
      );

      expect(res.id).toBe('grn-1');
      expect(grnRepo.create).toHaveBeenCalled();
      expect(stockRepo.upsertStock).toHaveBeenCalled();
      expect(movementRepo.create).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalled();
    });

    it('should reject receiving if accepted quantity exceeds ordered quantity', async () => {
      await expect(
        service.receiveGoods(
          {
            salonId: 'sal-1',
            branchId: 'br-1',
            purchaseOrderId: 'po-1',
            supplierId: 'sup-1',
            items: [
              {
                purchaseOrderItemId: 'poi-1',
                productVariantId: 'var-1',
                receivedQuantity: 20,
                acceptedQuantity: 20,
                unitCostPrice: 100,
              },
            ],
          },
          'user-1',
        ),
      ).rejects.toThrow();
    });
  });
});
