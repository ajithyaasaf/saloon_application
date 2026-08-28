import { Test, TestingModule } from '@nestjs/testing';
import { StockMovementType } from '@prisma/client';
import { StockMovementRepository } from '../repositories/stock-movement.repository';
import { StockMovementService } from '../services/stock-movement.service';

describe('StockMovementService', () => {
  let service: StockMovementService;
  let movementRepo: any;

  const mockMovement = {
    id: 'mov-1',
    movementCode: 'SM-SAL1-0001',
    salonId: 'sal-1',
    branchId: 'br-1',
    productVariantId: 'var-1',
    batchNumber: 'DEFAULT_BATCH',
    type: StockMovementType.PURCHASE_RECEIPT,
    quantity: 10,
    unitCostPrice: 100,
    totalValue: 1000,
    previousQuantity: 0,
    newQuantity: 10,
    actorUserId: 'user-1',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    movementRepo = {
      findById: jest.fn().mockResolvedValue(mockMovement),
      findByVariant: jest.fn().mockResolvedValue([mockMovement]),
      findByBranch: jest.fn().mockResolvedValue([mockMovement]),
      findByReference: jest.fn().mockResolvedValue([mockMovement]),
      search: jest.fn().mockResolvedValue({ data: [mockMovement], total: 1 }),
      create: jest.fn().mockResolvedValue(mockMovement),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockMovementService,
        { provide: StockMovementRepository, useValue: movementRepo },
      ],
    }).compile();

    service = module.get<StockMovementService>(StockMovementService);
  });

  describe('recordMovement', () => {
    it('should create an immutable stock movement record', async () => {
      const res = await service.recordMovement({
        salonId: 'sal-1',
        branchId: 'br-1',
        productVariantId: 'var-1',
        type: StockMovementType.PURCHASE_RECEIPT,
        quantity: 10,
        previousQuantity: 0,
        newQuantity: 10,
        actorUserId: 'user-1',
      });

      expect(res.id).toBe('mov-1');
      expect(movementRepo.create).toHaveBeenCalled();
    });
  });

  describe('searchMovements', () => {
    it('should return paginated movements', async () => {
      const res = await service.searchMovements({ page: 1, limit: 10 });
      expect(res.data).toHaveLength(1);
      expect(res.total).toBe(1);
    });
  });
});
