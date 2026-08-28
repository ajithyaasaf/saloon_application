import { Test, TestingModule } from '@nestjs/testing';
import { TransferStatus } from '@prisma/client';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { InventoryStockRepository } from '../repositories/inventory-stock.repository';
import { StockMovementRepository } from '../repositories/stock-movement.repository';
import { StockTransferItemRepository, StockTransferRepository } from '../repositories/stock-transfer.repository';
import { StockTransferService } from '../services/stock-transfer.service';

describe('StockTransferService', () => {
  let service: StockTransferService;
  let transferRepo: any;
  let itemRepo: any;
  let stockRepo: any;
  let movementRepo: any;
  let txService: any;
  let auditService: any;
  let cacheService: any;
  let eventBus: any;

  const mockTransfer = {
    id: 'trf-1',
    transferCode: 'TRF-SAL1-0001',
    salonId: 'sal-1',
    sourceBranchId: 'br-1',
    destinationBranchId: 'br-2',
    status: TransferStatus.DRAFT,
  };

  const mockItem = {
    id: 'item-1',
    stockTransferId: 'trf-1',
    productVariantId: 'var-1',
    batchNumber: 'DEFAULT_BATCH',
    dispatchedQuantity: 5,
    receivedQuantity: 0,
  };

  const mockStock = {
    id: 'stock-1',
    branchId: 'br-1',
    productVariantId: 'var-1',
    quantityOnHand: 20,
    version: 1,
  };

  beforeEach(async () => {
    transferRepo = {
      findById: jest.fn().mockResolvedValue(mockTransfer),
      create: jest.fn().mockResolvedValue(mockTransfer),
      updateStatus: jest.fn().mockResolvedValue({ ...mockTransfer, status: TransferStatus.DISPATCHED }),
      search: jest.fn().mockResolvedValue({ data: [mockTransfer], total: 1 }),
    };

    itemRepo = {
      findByTransfer: jest.fn().mockResolvedValue([mockItem]),
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
        StockTransferService,
        { provide: StockTransferRepository, useValue: transferRepo },
        { provide: StockTransferItemRepository, useValue: itemRepo },
        { provide: InventoryStockRepository, useValue: stockRepo },
        { provide: StockMovementRepository, useValue: movementRepo },
        { provide: TransactionService, useValue: txService },
        { provide: AuditService, useValue: auditService },
        { provide: CacheService, useValue: cacheService },
        { provide: EventBusService, useValue: eventBus },
      ],
    }).compile();

    service = module.get<StockTransferService>(StockTransferService);
  });

  describe('createTransfer', () => {
    it('should create a transfer between two branches', async () => {
      const res = await service.createTransfer(
        {
          salonId: 'sal-1',
          sourceBranchId: 'br-1',
          destinationBranchId: 'br-2',
          items: [{ productVariantId: 'var-1', dispatchedQuantity: 5 }],
        },
        'user-1',
      );

      expect(res.id).toBe('trf-1');
      expect(transferRepo.create).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalled();
    });

    it('should prevent transfer if source and destination branches are identical', async () => {
      await expect(
        service.createTransfer(
          {
            salonId: 'sal-1',
            sourceBranchId: 'br-1',
            destinationBranchId: 'br-1',
            items: [{ productVariantId: 'var-1', dispatchedQuantity: 5 }],
          },
          'user-1',
        ),
      ).rejects.toThrow();
    });
  });

  describe('dispatchTransfer', () => {
    it('should dispatch transfer, deduct source stock, and create movement', async () => {
      const res = await service.dispatchTransfer('trf-1', 'sal-1', 'user-1');
      expect(res.status).toBe(TransferStatus.DISPATCHED);
      expect(stockRepo.updateStock).toHaveBeenCalled();
      expect(movementRepo.create).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalled();
    });
  });

  describe('receiveTransfer', () => {
    it('should receive transfer, increment destination stock, and create movement', async () => {
      transferRepo.findById.mockResolvedValueOnce({ ...mockTransfer, status: TransferStatus.DISPATCHED });
      transferRepo.updateStatus.mockResolvedValueOnce({ ...mockTransfer, status: TransferStatus.FULLY_RECEIVED });

      const res = await service.receiveTransfer('trf-1', 'sal-1', 'user-1');
      expect(res.status).toBe(TransferStatus.FULLY_RECEIVED);
      expect(stockRepo.upsertStock).toHaveBeenCalled();
      expect(movementRepo.create).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalled();
    });
  });
});
