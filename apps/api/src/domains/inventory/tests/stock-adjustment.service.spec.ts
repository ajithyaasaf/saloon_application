import { Test, TestingModule } from '@nestjs/testing';
import { AdjustmentReason } from '@prisma/client';
import { AuditService } from '../../../shared/audit/audit.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { InventoryStockRepository } from '../repositories/inventory-stock.repository';
import { StockAdjustmentItemRepository, StockAdjustmentRepository } from '../repositories/stock-adjustment.repository';
import { StockMovementRepository } from '../repositories/stock-movement.repository';
import { StockAdjustmentService } from '../services/stock-adjustment.service';

describe('StockAdjustmentService', () => {
  let service: StockAdjustmentService;
  let adjustmentRepo: any;
  let itemRepo: any;
  let stockRepo: any;
  let movementRepo: any;
  let txService: any;
  let auditService: any;
  let eventBus: any;

  const mockAdjustment = {
    id: 'adj-1',
    adjustmentCode: 'ADJ-SAL1-0001',
    salonId: 'sal-1',
    branchId: 'br-1',
    reason: AdjustmentReason.DAMAGE,
    status: 'PENDING_APPROVAL',
  };

  const mockItem = {
    id: 'item-1',
    stockAdjustmentId: 'adj-1',
    productVariantId: 'var-1',
    batchNumber: 'DEFAULT_BATCH',
    systemQuantity: 10,
    actualQuantity: 8,
    adjustmentQuantity: -2,
    unitCostPrice: 100,
  };

  const mockStock = {
    id: 'stock-1',
    branchId: 'br-1',
    productVariantId: 'var-1',
    quantityOnHand: 10,
    version: 1,
  };

  beforeEach(async () => {
    adjustmentRepo = {
      findById: jest.fn().mockResolvedValue(mockAdjustment),
      create: jest.fn().mockResolvedValue(mockAdjustment),
      approve: jest.fn().mockResolvedValue({ ...mockAdjustment, status: 'APPROVED' }),
      reject: jest.fn().mockResolvedValue({ ...mockAdjustment, status: 'REJECTED' }),
      findByBranch: jest.fn().mockResolvedValue([mockAdjustment]),
    };

    itemRepo = {
      findByAdjustment: jest.fn().mockResolvedValue([mockItem]),
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

    eventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockAdjustmentService,
        { provide: StockAdjustmentRepository, useValue: adjustmentRepo },
        { provide: StockAdjustmentItemRepository, useValue: itemRepo },
        { provide: InventoryStockRepository, useValue: stockRepo },
        { provide: StockMovementRepository, useValue: movementRepo },
        { provide: TransactionService, useValue: txService },
        { provide: AuditService, useValue: auditService },
        { provide: EventBusService, useValue: eventBus },
      ],
    }).compile();

    service = module.get<StockAdjustmentService>(StockAdjustmentService);
  });

  describe('createAdjustment', () => {
    it('should create pending adjustment', async () => {
      const res = await service.createAdjustment(
        {
          salonId: 'sal-1',
          branchId: 'br-1',
          reason: AdjustmentReason.DAMAGE,
          items: [
            {
              productVariantId: 'var-1',
              systemQuantity: 10,
              actualQuantity: 8,
              unitCostPrice: 100,
            },
          ],
        },
        'user-1',
      );

      expect(res.id).toBe('adj-1');
      expect(adjustmentRepo.create).toHaveBeenCalled();
    });
  });

  describe('approveAdjustment', () => {
    it('should approve adjustment, update stock, and create movement', async () => {
      const res = await service.approveAdjustment('adj-1', 'sal-1', 'user-1');
      expect(res.status).toBe('APPROVED');
      expect(stockRepo.updateStock).toHaveBeenCalled();
      expect(movementRepo.create).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalled();
    });
  });

  describe('rejectAdjustment', () => {
    it('should reject adjustment without changing stock', async () => {
      const res = await service.rejectAdjustment('adj-1', 'sal-1', 'Bad count', 'user-1');
      expect(res.status).toBe('REJECTED');
      expect(stockRepo.updateStock).not.toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalled();
    });
  });
});
