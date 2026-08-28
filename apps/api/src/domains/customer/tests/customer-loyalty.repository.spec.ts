import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CustomerLoyaltyRepository } from '../repositories/customer-loyalty.repository';

describe('CustomerLoyaltyRepository', () => {
  let repository: CustomerLoyaltyRepository;
  let prisma: any;

  const mockLoyalty = {
    id: 'loy_123',
    customerProfileId: 'cust_123',
    pointsBalance: 150,
    lifetimePointsEarned: 300,
    currentTier: 'GOLD',
    version: 1,
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      customerLoyalty: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerLoyaltyRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<CustomerLoyaltyRepository>(CustomerLoyaltyRepository);
  });

  describe('findByCustomer', () => {
    it('should find loyalty account by customer profile ID', async () => {
      prisma.customerLoyalty.findUnique.mockResolvedValue(mockLoyalty);

      const result = await repository.findByCustomer('cust_123');
      expect(result).toEqual(mockLoyalty);
      expect(prisma.customerLoyalty.findUnique).toHaveBeenCalledWith({
        where: { customerProfileId: 'cust_123' },
      });
    });
  });

  describe('update', () => {
    it('should throw ConflictException on version mismatch', async () => {
      prisma.customerLoyalty.findUnique.mockResolvedValue(mockLoyalty);

      await expect(
        repository.update('cust_123', 200, 350, 'GOLD', 99),
      ).rejects.toThrow(ConflictException);
    });

    it('should update loyalty balance and tier when version matches', async () => {
      prisma.customerLoyalty.findUnique.mockResolvedValue(mockLoyalty);
      prisma.customerLoyalty.update.mockResolvedValue({
        ...mockLoyalty,
        pointsBalance: 200,
        lifetimePointsEarned: 350,
        version: 2,
      });

      const result = await repository.update('cust_123', 200, 350, 'GOLD', 1);
      expect(result.pointsBalance).toBe(200);
      expect(result.version).toBe(2);
    });
  });
});
