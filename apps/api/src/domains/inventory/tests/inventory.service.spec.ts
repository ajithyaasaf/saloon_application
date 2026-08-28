import { Test, TestingModule } from '@nestjs/testing';
import { StockMovementType } from '@prisma/client';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { InventoryStockRepository } from '../repositories/inventory-stock.repository';
import { StockMovementRepository } from '../repositories/stock-movement.repository';
import { InventoryService } from '../services/inventory.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let stockRepo: any;
  let movementRepo: any;
  let txService: any;
  let auditService: any;
  let cacheService: any;
  let eventBus: any;

  const mockStock = {
    id: 'stock-1',
    salonId: 'sal-1',
    branchId: 'br-1',
    productVariantId: 'var-1',
    batchNumber: 'DEFAULT_BATCH',
    quantityOnHand: 50,
    quantityReserved: 10,
    quantityAvailable: 40,
    version: 1,
  };

  beforeEach(async () => {
    stockRepo = {
      findById: jest.fn().mockResolvedValue(mockStock),
      findByVariant: jest.fn().mockResolvedValue(mockStock),
      findByBranch: jest.fn().mockResolvedValue([mockStock]),
      findLowStock: jest.fn().mockResolvedValue([mockStock]),
      findExpiring: jest.fn().mockResolvedValue([mockStock]),
      search: jest.fn().mockResolvedValue({ data: [mockStock], total: 1 }),
      upsertStock: jest.fn().mockResolvedValue({ ...mockStock, quantityOnHand: 60 }),
      updateStock: jest.fn().mockResolvedValue({ ...mockStock, quantityOnHand: 40 }),
      reserve: jest.fn().mockResolvedValue({ ...mockStock, quantityReserved: 15 }),
      releaseReservation: jest.fn().mockResolvedValue({ ...mockStock, quantityReserved: 5 }),
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
        InventoryService,
        { provide: InventoryStockRepository, useValue: stockRepo },
        { provide: StockMovementRepository, useValue: movementRepo },
        { provide: TransactionService, useValue: txService },
        { provide: AuditService, useValue: auditService },
        { provide: CacheService, useValue: cacheService },
        { provide: EventBusService, useValue: eventBus },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  describe('increaseStock', () => {
    it('should increase stock and record movement', async () => {
      const res = await service.increaseStock(
        'sal-1',
        'br-1',
        'var-1',
        'DEFAULT_BATCH',
        10,
        100,
        StockMovementType.PURCHASE_RECEIPT,
        'user-1',
      );

      expect(res.quantityOnHand).toBe(60);
      expect(stockRepo.upsertStock).toHaveBeenCalled();
      expect(movementRepo.create).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalled();
    });
  });

  describe('decreaseStock', () => {
    it('should decrease stock if enough available', async () => {
      const res = await service.decreaseStock(
        'sal-1',
        'br-1',
        'var-1',
        'DEFAULT_BATCH',
        10,
        StockMovementType.SALE,
        'user-1',
      );

      expect(res.quantityOnHand).toBe(40);
      expect(stockRepo.updateStock).toHaveBeenCalled();
      expect(movementRepo.create).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalled();
    });

    it('should prevent decreasing stock below available quantity', async () => {
      await expect(
        service.decreaseStock(
          'sal-1',
          'br-1',
          'var-1',
          'DEFAULT_BATCH',
          100,
          StockMovementType.SALE,
          'user-1',
        ),
      ).rejects.toThrow();
    });
  });

  describe('reserveStock and releaseReservation', () => {
    it('should reserve stock successfully', async () => {
      const res = await service.reserveStock('br-1', 'var-1', 'DEFAULT_BATCH', 5, 'user-1');
      expect(res.quantityReserved).toBe(15);
      expect(stockRepo.reserve).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalled();
    });

    it('should release reservation successfully', async () => {
      const res = await service.releaseReservation('br-1', 'var-1', 'DEFAULT_BATCH', 5, 'user-1');
      expect(res.quantityReserved).toBe(5);
      expect(stockRepo.releaseReservation).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalled();
    });
  });
});
