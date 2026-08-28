import { Test, TestingModule } from '@nestjs/testing';
import { ServiceStatus } from '@prisma/client';
import { ConflictException } from '../../../../common/exceptions/conflict.exception';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { BranchServiceRepository } from '../branch-service.repository';

describe('BranchServiceRepository', () => {
  let repository: BranchServiceRepository;
  let prismaMock: {
    branchService: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaMock = {
      branchService: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BranchServiceRepository,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    repository = module.get<BranchServiceRepository>(BranchServiceRepository);
  });

  const mockBranchService = {
    id: 'bs_100',
    branchId: 'br_100',
    serviceId: 'srv_100',
    price: 450.0,
    durationMinutes: 45,
    status: ServiceStatus.ACTIVE,
    isActive: true,
    version: 1,
    deletedAt: null,
  };

  describe('findById(), findByBranch(), and findBranchService()', () => {
    it('should return branch service by ID excluding soft deleted records', async () => {
      prismaMock.branchService.findFirst.mockResolvedValue(mockBranchService);

      const res = await repository.findById('bs_100');
      expect(res).toEqual(mockBranchService);
      expect(prismaMock.branchService.findFirst).toHaveBeenCalledWith({
        where: { id: 'bs_100', deletedAt: null },
      });
    });

    it('should lookup branch service using composite lookup index (branchId, serviceId)', async () => {
      prismaMock.branchService.findFirst.mockResolvedValue(mockBranchService);

      const res = await repository.findBranchService('br_100', 'srv_100');
      expect(res).toEqual(mockBranchService);
      expect(prismaMock.branchService.findFirst).toHaveBeenCalledWith({
        where: { branchId: 'br_100', serviceId: 'srv_100', deletedAt: null },
      });
    });

    it('should list active branch services using status index (branchId, isActive, status)', async () => {
      prismaMock.branchService.findMany.mockResolvedValue([mockBranchService]);

      const res = await repository.listActive('br_100');
      expect(res).toHaveLength(1);
      expect(prismaMock.branchService.findMany).toHaveBeenCalledWith({
        where: {
          branchId: 'br_100',
          isActive: true,
          status: ServiceStatus.ACTIVE,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('updatePrice() and softDelete()', () => {
    it('should update price and increment version', async () => {
      prismaMock.branchService.findFirst.mockResolvedValue(mockBranchService);
      prismaMock.branchService.update.mockResolvedValue({ ...mockBranchService, price: 500.0, version: 2 });

      const updated = await repository.updatePrice('bs_100', 1, 500.0);
      expect(updated.version).toBe(2);
      expect(prismaMock.branchService.update).toHaveBeenCalledWith({
        where: { id: 'bs_100' },
        data: expect.objectContaining({
          price: 500.0,
          version: { increment: 1 },
        }),
      });
    });

    it('should soft delete and archive branch service on softDelete()', async () => {
      prismaMock.branchService.findFirst.mockResolvedValue(mockBranchService);
      prismaMock.branchService.update.mockResolvedValue({
        ...mockBranchService,
        deletedAt: new Date(),
        status: ServiceStatus.ARCHIVED,
        isActive: false,
      });

      await repository.softDelete('bs_100', 1);
      expect(prismaMock.branchService.update).toHaveBeenCalledWith({
        where: { id: 'bs_100' },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
          status: ServiceStatus.ARCHIVED,
          isActive: false,
          version: { increment: 1 },
        }),
      });
    });
  });
});
