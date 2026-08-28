import { Test, TestingModule } from '@nestjs/testing';
import { AlertStatus } from '@prisma/client';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { InventoryStockRepository, LowStockAlertRepository } from '../repositories/inventory-stock.repository';
import { ProductVariantRepository } from '../repositories/product.repository';
import { LowStockAlertService } from '../services/low-stock-alert.service';

describe('LowStockAlertService', () => {
  let service: LowStockAlertService;
  let alertRepo: any;
  let stockRepo: any;
  let variantRepo: any;
  let cacheService: any;
  let eventBus: any;

  const mockAlert = {
    id: 'alert-1',
    salonId: 'sal-1',
    branchId: 'br-1',
    productVariantId: 'var-1',
    currentQuantity: 3,
    reorderPoint: 10,
    alertStatus: AlertStatus.ACTIVE,
  };

  const mockVariant = {
    id: 'var-1',
    reorderPoint: 10,
  };

  const mockStock = {
    id: 'stock-1',
    salonId: 'sal-1',
    branchId: 'br-1',
    productVariantId: 'var-1',
    quantityOnHand: 3,
  };

  beforeEach(async () => {
    alertRepo = {
      findById: jest.fn().mockResolvedValue(mockAlert),
      findActive: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue(mockAlert),
      acknowledge: jest.fn().mockResolvedValue({ ...mockAlert, alertStatus: AlertStatus.ACKNOWLEDGED }),
      resolve: jest.fn().mockResolvedValue({ ...mockAlert, alertStatus: AlertStatus.RESOLVED }),
    };

    stockRepo = {
      findByBranch: jest.fn().mockResolvedValue([mockStock]),
    };

    variantRepo = {
      findById: jest.fn().mockResolvedValue(mockVariant),
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
        LowStockAlertService,
        { provide: LowStockAlertRepository, useValue: alertRepo },
        { provide: InventoryStockRepository, useValue: stockRepo },
        { provide: ProductVariantRepository, useValue: variantRepo },
        { provide: CacheService, useValue: cacheService },
        { provide: EventBusService, useValue: eventBus },
      ],
    }).compile();

    service = module.get<LowStockAlertService>(LowStockAlertService);
  });

  describe('evaluateStockLevel', () => {
    it('should trigger alert when stock is at or below reorder point', async () => {
      const res = await service.evaluateStockLevel('br-1', 'var-1', 'user-1');
      expect(res).not.toBeNull();
      expect(alertRepo.create).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalled();
    });

    it('should not create duplicate alert if already active', async () => {
      alertRepo.findActive.mockResolvedValueOnce([mockAlert]);
      const res = await service.evaluateStockLevel('br-1', 'var-1', 'user-1');
      expect(res).toBeNull();
      expect(alertRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge alert and invalidate cache', async () => {
      const res = await service.acknowledgeAlert('alert-1', 'sal-1', 'user-1');
      expect(res.alertStatus).toBe(AlertStatus.ACKNOWLEDGED);
      expect(alertRepo.acknowledge).toHaveBeenCalledWith('alert-1', 'user-1');
    });
  });

  describe('resolveAlert', () => {
    it('should resolve alert and invalidate cache', async () => {
      const res = await service.resolveAlert('alert-1', 'sal-1', 'user-1');
      expect(res.alertStatus).toBe(AlertStatus.RESOLVED);
      expect(alertRepo.resolve).toHaveBeenCalledWith('alert-1');
    });
  });
});
