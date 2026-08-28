import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PurchaseOrderRepository } from '../repositories/purchase-order.repository';

describe('PurchaseOrderRepository', () => {
  let repository: PurchaseOrderRepository;
  let db: any;

  const mockPO = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    poCode: 'PO-SAL1-2026-0001',
    salonId: 'sal_1',
    branchId: 'br_1',
    supplierId: 'sup_1',
    status: 'DRAFT',
    subtotal: 100000,
    taxAmount: 18000,
    totalAmount: 118000,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    db = {
      purchaseOrder: {
        findFirst: jest.fn().mockResolvedValue(mockPO),
        findMany: jest.fn().mockResolvedValue([mockPO]),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue(mockPO),
        update: jest.fn().mockResolvedValue({ ...mockPO, status: 'APPROVED' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseOrderRepository,
        { provide: PrismaService, useValue: db },
      ],
    }).compile();

    repository = module.get<PurchaseOrderRepository>(PurchaseOrderRepository);
  });

  describe('create', () => {
    it('should calculate subtotal, tax, and total amount when creating PO', async () => {
      const res = await repository.create(
        {
          salonId: 'sal_1',
          branchId: 'br_1',
          supplierId: 'sup_1',
          items: [
            { productVariantId: 'var_1', orderedQuantity: 10, unitCostPrice: 10000, taxRate: 18 },
          ],
        },
        'PO-SAL1-2026-0001',
      );

      expect(res.id).toBe(mockPO.id);
      expect(db.purchaseOrder.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update PO status', async () => {
      const res = await repository.update('123e4567-e89b-12d3-a456-426614174000', { status: 'APPROVED' as any });
      expect(res.status).toBe('APPROVED');
    });
  });
});
