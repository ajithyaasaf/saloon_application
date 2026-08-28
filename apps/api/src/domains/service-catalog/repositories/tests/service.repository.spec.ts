import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '../../../../common/exceptions/conflict.exception';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { ServiceRepository } from '../service.repository';

describe('ServiceRepository', () => {
  let repository: ServiceRepository;
  let prismaMock: {
    service: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaMock = {
      service: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceRepository,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    repository = module.get<ServiceRepository>(ServiceRepository);
  });

  const mockService = {
    id: 'srv_100',
    categoryId: 'cat_100',
    name: "Men's Haircut",
    description: 'Scissor haircut',
    genderCategory: 'UNISEX',
    coverMediaId: null,
    version: 1,
    deletedAt: null,
  };

  describe('findById() and findByCategory()', () => {
    it('should return service by ID excluding soft-deleted records', async () => {
      prismaMock.service.findFirst.mockResolvedValue(mockService);

      const result = await repository.findById('srv_100');
      expect(result).toEqual(mockService);
      expect(prismaMock.service.findFirst).toHaveBeenCalledWith({
        where: { id: 'srv_100', deletedAt: null },
      });
    });

    it('should return services by category ID', async () => {
      prismaMock.service.findMany.mockResolvedValue([mockService]);

      const result = await repository.findByCategory('cat_100');
      expect(result).toHaveLength(1);
      expect(prismaMock.service.findMany).toHaveBeenCalledWith({
        where: { categoryId: 'cat_100', deletedAt: null },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('search()', () => {
    it('should filter, search, and paginate services', async () => {
      prismaMock.service.findMany.mockResolvedValue([mockService]);
      prismaMock.service.count.mockResolvedValue(1);

      const res = await repository.search({ page: 1, limit: 10, search: 'Haircut', categoryId: 'cat_100' });
      expect(res.data).toHaveLength(1);
      expect(res.meta.total).toBe(1);
      expect(prismaMock.service.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          deletedAt: null,
          categoryId: 'cat_100',
          OR: [
            { name: { contains: 'Haircut', mode: 'insensitive' } },
            { description: { contains: 'Haircut', mode: 'insensitive' } },
          ],
        }),
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('optimistic concurrency and soft delete', () => {
    it('should throw ConflictException when expected version mismatches', async () => {
      prismaMock.service.findFirst.mockResolvedValue({ ...mockService, version: 2 });

      await expect(repository.update('srv_100', 1, { name: 'New Name' })).rejects.toThrow(ConflictException);
    });

    it('should soft delete service setting deletedAt', async () => {
      prismaMock.service.findFirst.mockResolvedValue(mockService);
      prismaMock.service.update.mockResolvedValue({ ...mockService, deletedAt: new Date() });

      await repository.softDelete('srv_100', 1);
      expect(prismaMock.service.update).toHaveBeenCalledWith({
        where: { id: 'srv_100' },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
          version: { increment: 1 },
        }),
      });
    });
  });
});
