import { Test, TestingModule } from '@nestjs/testing';
import { ProductUsageType } from '@prisma/client';
import { AuditService } from '../../../shared/audit/audit.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { InventoryStockRepository } from '../repositories/inventory-stock.repository';
import { ProductUsageRepository } from '../repositories/product-usage.repository';
import { StockMovementRepository } from '../repositories/stock-movement.repository';
import { ProductUsageService } from '../services/product-usage.service';

describe('ProductUsageService', () => {
  let service: ProductUsageService;
  let usageRepo: any;
  let stockRepo: any;
  let movementRepo: any;
  let txService: any;
  let auditService: any;
  let eventBus: any;

  const mockUsage = {
    id: 'usg-1',
    usageCode: 'USG-SAL1-0001',
    salonId: 'sal-1',
    branchId: 'br-1',
    productVariantId: 'var-1',
    quantity: 2,
    usageType: ProductUsageType.SERVICE_CONSUMPTION,
  };

  const mockStock = {
    id: 'stock-1',
    branchId: 'br-1',
    productVariantId: 'var-1',
    quantityOnHand: 10,
    quantityReserved: 0,
    version: 1,
  };

  beforeEach(async () => {
    usageRepo = {
      findById: jest.fn().mockResolvedValue(mockUsage),
      findByProduct: jest.fn().mockResolvedValue([mockUsage]),
      findByBranch: jest.fn().mockResolvedValue([mockUsage]),
      findByReference: jest.fn().mockResolvedValue([mockUsage]),
      create: jest.fn().mockResolvedValue(mockUsage),
    };

    stockRepo = {
      findByVariant: jest.fn().mockResolvedValue(mockStock),
      updateStock: jest.fn().mockResolvedValue(mockStock),
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
        ProductUsageService,
        { provide: ProductUsageRepository, useValue: usageRepo },
        { provide: InventoryStockRepository, useValue: stockRepo },
        { provide: StockMovementRepository, useValue: movementRepo },
        { provide: TransactionService, useValue: txService },
        { provide: AuditService, useValue: auditService },
        { provide: EventBusService, useValue: eventBus },
      ],
    }).compile();

    service = module.get<ProductUsageService>(ProductUsageService);
  });

  describe('recordUsage', () => {
    it('should record usage, decrement stock, and record movement', async () => {
      const res = await service.recordUsage(
        {
          salonId: 'sal-1',
          branchId: 'br-1',
          productVariantId: 'var-1',
          usageType: ProductUsageType.SERVICE_CONSUMPTION,
          quantity: 2,
        },
        'user-1',
      );

      expect(res.id).toBe('usg-1');
      expect(usageRepo.create).toHaveBeenCalled();
      expect(stockRepo.updateStock).toHaveBeenCalled();
      expect(movementRepo.create).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalled();
    });

    it('should prevent recording usage if stock is insufficient', async () => {
      await expect(
        service.recordUsage(
          {
            salonId: 'sal-1',
            branchId: 'br-1',
            productVariantId: 'var-1',
            usageType: ProductUsageType.SERVICE_CONSUMPTION,
            quantity: 50,
          },
          'user-1',
        ),
      ).rejects.toThrow();
    });
  });
});
