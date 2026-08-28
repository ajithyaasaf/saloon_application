import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { InventoryStockRepository } from '../repositories/inventory-stock.repository';

describe('InventoryStockRepository', () => {
  let repository: InventoryStockRepository;
  let db: any;

  const mockStock = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    salonId: 'sal_1',
    branchId: 'br_1',
    productVariantId: 'var_1',
    batchNumber: 'BATCH-001',
    quantityOnHand: 50,
    quantityReserved: 5,
    quantityAvailable: 45,
    quantityOnOrder: 0,
    status: 'AVAILABLE',
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    db = {
      inventoryStock: {
        findUnique: jest.fn().mockResolvedValue(mockStock),
        findMany: jest.fn().mockResolvedValue([mockStock]),
        count: jest.fn().mockResolvedValue(1),
        update: jest.fn().mockResolvedValue({ ...mockStock, version: 2 }),
        upsert: jest.fn().mockResolvedValue(mockStock),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryStockRepository,
        { provide: PrismaService, useValue: db },
      ],
    }).compile();

    repository = module.get<InventoryStockRepository>(InventoryStockRepository);
  });

  describe('findByVariant', () => {
    it('should find inventory stock by branch, variant, and batch', async () => {
      const res = await repository.findByVariant('br_1', 'var_1', 'BATCH-001');
      expect(res).toEqual(mockStock);
    });
  });

  describe('reserve', () => {
    it('should reserve stock and increment version', async () => {
      const res = await repository.reserve('123e4567-e89b-12d3-a456-426614174000', 5, 1);
      expect(res.version).toBe(2);
      expect(db.inventoryStock.update).toHaveBeenCalled();
    });
  });

  describe('upsertStock', () => {
    it('should upsert stock for branch and variant', async () => {
      const res = await repository.upsertStock({
        salonId: 'sal_1',
        branchId: 'br_1',
        productVariantId: 'var_1',
        batchNumber: 'BATCH-001',
        quantityOnHand: 10,
      });
      expect(res).toEqual(mockStock);
    });
  });
});
