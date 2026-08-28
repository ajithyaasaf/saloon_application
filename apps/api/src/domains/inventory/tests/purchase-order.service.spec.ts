import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseOrderStatus } from '@prisma/client';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { ProductVariantRepository } from '../repositories/product.repository';
import { PurchaseOrderRepository } from '../repositories/purchase-order.repository';
import { SupplierRepository } from '../repositories/supplier.repository';
import { PurchaseOrderService } from '../services/purchase-order.service';

describe('PurchaseOrderService', () => {
  let service: PurchaseOrderService;
  let poRepo: any;
  let supplierRepo: any;
  let variantRepo: any;
  let txService: any;
  let auditService: any;
  let cacheService: any;
  let eventBus: any;

  const mockPO = {
    id: 'po-1',
    poCode: 'PO-SAL1-0001',
    salonId: 'sal-1',
    branchId: 'br-1',
    supplierId: 'sup-1',
    status: PurchaseOrderStatus.DRAFT,
    subtotal: 1000,
    taxAmount: 180,
    totalAmount: 1180,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    poRepo = {
      findById: jest.fn().mockResolvedValue(mockPO),
      create: jest.fn().mockResolvedValue(mockPO),
      update: jest.fn().mockResolvedValue({ ...mockPO, status: PurchaseOrderStatus.APPROVED }),
      search: jest.fn().mockResolvedValue({ data: [mockPO], total: 1 }),
    };

    supplierRepo = {
      findById: jest.fn().mockResolvedValue({ id: 'sup-1', salonId: 'sal-1' }),
    };

    variantRepo = {
      findById: jest.fn().mockResolvedValue({ id: 'var-1', productId: 'prod-1' }),
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
        PurchaseOrderService,
        { provide: PurchaseOrderRepository, useValue: poRepo },
        { provide: SupplierRepository, useValue: supplierRepo },
        { provide: ProductVariantRepository, useValue: variantRepo },
        { provide: TransactionService, useValue: txService },
        { provide: AuditService, useValue: auditService },
        { provide: CacheService, useValue: cacheService },
        { provide: EventBusService, useValue: eventBus },
      ],
    }).compile();

    service = module.get<PurchaseOrderService>(PurchaseOrderService);
  });

  describe('createPurchaseOrder', () => {
    it('should create purchase order and publish event', async () => {
      const res = await service.createPurchaseOrder(
        {
          salonId: 'sal-1',
          branchId: 'br-1',
          supplierId: 'sup-1',
          items: [{ productVariantId: 'var-1', orderedQuantity: 10, unitCostPrice: 100 }],
        },
        'user-1',
      );

      expect(res.id).toBe('po-1');
      expect(poRepo.create).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalled();
    });
  });

  describe('approvePurchaseOrder', () => {
    it('should approve purchase order and update status', async () => {
      const res = await service.approvePurchaseOrder('po-1', 'sal-1', 'user-1');
      expect(res.status).toBe(PurchaseOrderStatus.APPROVED);
      expect(eventBus.publish).toHaveBeenCalled();
    });
  });

  describe('cancelPurchaseOrder', () => {
    it('should cancel purchase order from valid state', async () => {
      poRepo.update.mockResolvedValueOnce({ ...mockPO, status: PurchaseOrderStatus.CANCELLED });
      const res = await service.cancelPurchaseOrder('po-1', 'sal-1', 'Changed mind', 'user-1');
      expect(res.status).toBe(PurchaseOrderStatus.CANCELLED);
      expect(eventBus.publish).toHaveBeenCalled();
    });
  });
});
