import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '../../../../common/exceptions/conflict.exception';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { BranchRepository } from '../branch.repository';

describe('BranchRepository', () => {
  let repository: BranchRepository;
  let prismaMock: {
    branch: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaMock = {
      branch: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BranchRepository,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    repository = module.get<BranchRepository>(BranchRepository);
  });

  const mockBranch = {
    id: 'br_100',
    salonId: 'sal_100',
    branchName: 'Main Branch',
    isPrimary: true,
    addressLine1: '123 MG Road',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560001',
    latitude: 12.9716,
    longitude: 77.5946,
    phone: '+919876543210',
    version: 1,
    deletedAt: null,
  };

  describe('findById() and findPrimaryBranch()', () => {
    it('should return branch by ID', async () => {
      prismaMock.branch.findFirst.mockResolvedValue(mockBranch);

      const result = await repository.findById('br_100');
      expect(result).toEqual(mockBranch);
    });

    it('should return primary branch for a salon', async () => {
      prismaMock.branch.findFirst.mockResolvedValue(mockBranch);

      const result = await repository.findPrimaryBranch('sal_100');
      expect(result).toEqual(mockBranch);
      expect(prismaMock.branch.findFirst).toHaveBeenCalledWith({
        where: { salonId: 'sal_100', isPrimary: true, deletedAt: null },
      });
    });
  });

  describe('setPrimaryBranch()', () => {
    it('should unset current primary branch and set new primary branch atomically', async () => {
      prismaMock.branch.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.branch.update.mockResolvedValue({ ...mockBranch, id: 'br_200', isPrimary: true });

      await repository.setPrimaryBranch('sal_100', 'br_200');

      expect(prismaMock.branch.updateMany).toHaveBeenCalledWith({
        where: { salonId: 'sal_100', isPrimary: true },
        data: { isPrimary: false },
      });
      expect(prismaMock.branch.update).toHaveBeenCalledWith({
        where: { id: 'br_200' },
        data: { isPrimary: true },
      });
    });
  });

  describe('findNearby()', () => {
    it('should filter branches within geographical radiusKm', async () => {
      prismaMock.branch.findMany.mockResolvedValue([
        mockBranch, // ~0 KM away
        { ...mockBranch, id: 'br_far', latitude: 28.6139, longitude: 77.2090 }, // Delhi ~1700 KM away
      ]);

      const nearby = await repository.findNearby(12.9716, 77.5946, 10);
      expect(nearby).toHaveLength(1);
      expect(nearby[0].id).toBe('br_100');
    });
  });
});
