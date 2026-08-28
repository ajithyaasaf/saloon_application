import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '../../../../common/exceptions/conflict.exception';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { SalonRepository } from '../salon.repository';

describe('SalonRepository', () => {
  let repository: SalonRepository;
  let prismaMock: {
    salon: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaMock = {
      salon: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalonRepository,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    repository = module.get<SalonRepository>(SalonRepository);
  });

  const mockSalon = {
    id: 'sal_100',
    ownerId: 'usr_owner',
    brandName: 'Glamour Cuts',
    slug: 'glamour-cuts',
    status: 'APPROVED',
    version: 1,
    deletedAt: null,
  };

  describe('findById() and findBySlug()', () => {
    it('should return salon by ID excluding deleted records', async () => {
      prismaMock.salon.findFirst.mockResolvedValue(mockSalon);

      const result = await repository.findById('sal_100');
      expect(result).toEqual(mockSalon);
      expect(prismaMock.salon.findFirst).toHaveBeenCalledWith({
        where: { id: 'sal_100', deletedAt: null },
      });
    });

    it('should return salon by slug', async () => {
      prismaMock.salon.findFirst.mockResolvedValue(mockSalon);

      const result = await repository.findBySlug('glamour-cuts');
      expect(result).toEqual(mockSalon);
      expect(prismaMock.salon.findFirst).toHaveBeenCalledWith({
        where: { slug: 'glamour-cuts', deletedAt: null },
      });
    });
  });

  describe('create() and update()', () => {
    it('should create new salon with version 1', async () => {
      prismaMock.salon.create.mockResolvedValue(mockSalon);

      const created = await repository.create({
        brandName: 'Glamour Cuts',
        ownerId: 'usr_owner',
      });

      expect(created).toEqual(mockSalon);
      expect(prismaMock.salon.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          brandName: 'Glamour Cuts',
          version: 1,
        }),
      });
    });

    it('should update salon and increment version when expected version matches', async () => {
      prismaMock.salon.findFirst.mockResolvedValue(mockSalon);
      prismaMock.salon.update.mockResolvedValue({ ...mockSalon, version: 2 });

      const updated = await repository.update('sal_100', 1, { brandName: 'Updated Brand' });

      expect(updated.version).toBe(2);
      expect(prismaMock.salon.update).toHaveBeenCalledWith({
        where: { id: 'sal_100' },
        data: expect.objectContaining({
          brandName: 'Updated Brand',
          version: { increment: 1 },
        }),
      });
    });

    it('should throw ConflictException when optimistic concurrency version mismatches', async () => {
      prismaMock.salon.findFirst.mockResolvedValue({ ...mockSalon, version: 2 });

      await expect(
        repository.update('sal_100', 1, { brandName: 'Stale Update' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll()', () => {
    it('should return paginated salons list', async () => {
      prismaMock.salon.findMany.mockResolvedValue([mockSalon]);
      prismaMock.salon.count.mockResolvedValue(1);

      const res = await repository.findAll({ page: 1, limit: 10 });
      expect(res.data).toHaveLength(1);
      expect(res.meta.total).toBe(1);
    });
  });
});
