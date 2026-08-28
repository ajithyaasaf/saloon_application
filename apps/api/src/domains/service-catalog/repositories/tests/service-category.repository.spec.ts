import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '../../../../common/exceptions/conflict.exception';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { ServiceCategoryRepository } from '../service-category.repository';

describe('ServiceCategoryRepository', () => {
  let repository: ServiceCategoryRepository;
  let prismaMock: {
    serviceCategory: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaMock = {
      serviceCategory: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceCategoryRepository,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    repository = module.get<ServiceCategoryRepository>(ServiceCategoryRepository);
  });

  const mockCategory = {
    id: 'cat_100',
    name: 'Hair Styling',
    displayOrder: 1,
    iconMediaId: 'med_100',
    version: 1,
    deletedAt: null,
  };

  describe('findById() and findByName()', () => {
    it('should return category by ID filtering deleted records', async () => {
      prismaMock.serviceCategory.findFirst.mockResolvedValue(mockCategory);

      const result = await repository.findById('cat_100');
      expect(result).toEqual(mockCategory);
      expect(prismaMock.serviceCategory.findFirst).toHaveBeenCalledWith({
        where: { id: 'cat_100', deletedAt: null },
      });
    });

    it('should return category by name case-insensitively', async () => {
      prismaMock.serviceCategory.findFirst.mockResolvedValue(mockCategory);

      const result = await repository.findByName('Hair Styling');
      expect(result).toEqual(mockCategory);
      expect(prismaMock.serviceCategory.findFirst).toHaveBeenCalledWith({
        where: { name: { equals: 'Hair Styling', mode: 'insensitive' }, deletedAt: null },
      });
    });
  });

  describe('create(), update(), and softDelete()', () => {
    it('should create new category with version 1', async () => {
      prismaMock.serviceCategory.create.mockResolvedValue(mockCategory);

      const created = await repository.create({ name: 'Hair Styling', displayOrder: 1 });
      expect(created).toEqual(mockCategory);
    });

    it('should update category when version matches', async () => {
      prismaMock.serviceCategory.findFirst.mockResolvedValue(mockCategory);
      prismaMock.serviceCategory.update.mockResolvedValue({ ...mockCategory, version: 2, displayOrder: 2 });

      const updated = await repository.update('cat_100', 1, { displayOrder: 2 });
      expect(updated.version).toBe(2);
    });

    it('should throw ConflictException on version mismatch', async () => {
      prismaMock.serviceCategory.findFirst.mockResolvedValue({ ...mockCategory, version: 2 });

      await expect(repository.update('cat_100', 1, { displayOrder: 2 })).rejects.toThrow(ConflictException);
    });

    it('should soft delete category by setting deletedAt', async () => {
      prismaMock.serviceCategory.findFirst.mockResolvedValue(mockCategory);
      prismaMock.serviceCategory.update.mockResolvedValue({ ...mockCategory, deletedAt: new Date() });

      await repository.softDelete('cat_100', 1);
      expect(prismaMock.serviceCategory.update).toHaveBeenCalledWith({
        where: { id: 'cat_100' },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
          version: { increment: 1 },
        }),
      });
    });
  });
});
