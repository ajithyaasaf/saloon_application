import { Test, TestingModule } from '@nestjs/testing';
import { AuditStatus } from '@prisma/client';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { InventoryStockRepository } from '../repositories/inventory-stock.repository';
import { StockAuditItemRepository, StockAuditRepository } from '../repositories/stock-audit.repository';
import { StockMovementRepository } from '../repositories/stock-movement.repository';
import { StockAuditService } from '../services/stock-audit.service';

describe('StockAuditService', () => {
  let service: StockAuditService;
  let auditRepo: any;
  let itemRepo: any;
  let stockRepo: any;
  let movementRepo: any;
  let txService: any;
  let auditService: any;
  let cacheService: any;
  let eventBus: any;

  const mockAudit = {
    id: 'aud-1',
    auditCode: 'AUD-SAL1-0001',
    salonId: 'sal-1',
    branchId: 'br-1',
    status: AuditStatus.PLANNED,
  };

  const mockItem = {
    id: 'item-1',
    stockAuditId: 'aud-1',
    productVariantId: 'var-1',
    batchNumber: 'DEFAULT_BATCH',
    expectedQuantity: 10,
    countedQuantity: 12,
    unitCostPrice: 50,
  };

  const mockStock = {
    id: 'stock-1',
    branchId: 'br-1',
    productVariantId: 'var-1',
    quantityOnHand: 10,
    version: 1,
  };

  beforeEach(async () => {
    auditRepo = {
      findById: jest.fn().mockResolvedValue(mockAudit),
      create: jest.fn().mockResolvedValue(mockAudit),
      updateStatus: jest.fn().mockResolvedValue({ ...mockAudit, status: AuditStatus.COMPLETED }),
      search: jest.fn().mockResolvedValue({ data: [mockAudit], total: 1 }),
    };

    itemRepo = {
      findByAudit: jest.fn().mockResolvedValue([mockItem]),
    };

    stockRepo = {
      findByVariant: jest.fn().mockResolvedValue(mockStock),
      updateStock: jest.fn().mockResolvedValue(mockStock),
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
        StockAuditService,
        { provide: StockAuditRepository, useValue: auditRepo },
        { provide: StockAuditItemRepository, useValue: itemRepo },
        { provide: InventoryStockRepository, useValue: stockRepo },
        { provide: StockMovementRepository, useValue: movementRepo },
        { provide: TransactionService, useValue: txService },
        { provide: AuditService, useValue: auditService },
        { provide: CacheService, useValue: cacheService },
        { provide: EventBusService, useValue: eventBus },
      ],
    }).compile();

    service = module.get<StockAuditService>(StockAuditService);
  });

  describe('createAudit', () => {
    it('should create planned stock audit', async () => {
      const res = await service.createAudit(
        {
          salonId: 'sal-1',
          branchId: 'br-1',
          items: [{ productVariantId: 'var-1', expectedQuantity: 10, countedQuantity: 12, unitCostPrice: 50 }],
        },
        'user-1',
      );

      expect(res.id).toBe('aud-1');
      expect(auditRepo.create).toHaveBeenCalled();
    });
  });

  describe('startAudit', () => {
    it('should start planned audit', async () => {
      auditRepo.updateStatus.mockResolvedValueOnce({ ...mockAudit, status: AuditStatus.IN_PROGRESS });
      const res = await service.startAudit('aud-1', 'sal-1', 'user-1');
      expect(res.status).toBe(AuditStatus.IN_PROGRESS);
    });
  });

  describe('completeAudit', () => {
    it('should complete audit, create correction movements, and apply stock delta', async () => {
      auditRepo.findById.mockResolvedValueOnce({ ...mockAudit, status: AuditStatus.IN_PROGRESS });
      const res = await service.completeAudit('aud-1', 'sal-1', 'user-1');
      expect(res.status).toBe(AuditStatus.COMPLETED);
      expect(stockRepo.updateStock).toHaveBeenCalled();
      expect(movementRepo.create).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalled();
    });
  });
});
