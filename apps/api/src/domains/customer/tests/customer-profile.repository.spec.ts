import { Test, TestingModule } from '@nestjs/testing';
import { CustomerStatus, Gender } from '@prisma/client';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CustomerProfileRepository } from '../repositories/customer-profile.repository';

describe('CustomerProfileRepository', () => {
  let repository: CustomerProfileRepository;
  let prisma: any;

  const mockCustomer = {
    id: 'cust_123e4567-e89b-12d3-a456-426614174000',
    customerCode: 'CUST-SAL01-0042',
    salonId: 'sal_123e4567-e89b-12d3-a456-426614174001',
    primaryBranchId: 'br_123e4567-e89b-12d3-a456-426614174002',
    userId: null,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+919876543210',
    gender: Gender.MALE,
    birthDate: null,
    anniversaryDate: null,
    status: CustomerStatus.ACTIVE,
    walletBalance: 0,
    lifetimeSpend: 0,
    totalVisits: 0,
    noShowCount: 0,
    cancellationCount: 0,
    lastVisitAt: null,
    isBlacklisted: false,
    blacklistType: null,
    blacklistReason: null,
    blacklistedAt: null,
    blacklistedByUserId: null,
    version: 1,
    createdByUserId: 'usr_123',
    updatedByUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    prisma = {
      customerProfile: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerProfileRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<CustomerProfileRepository>(CustomerProfileRepository);
  });

  describe('findById', () => {
    it('should return customer profile if found and not deleted', async () => {
      prisma.customerProfile.findFirst.mockResolvedValue(mockCustomer);

      const result = await repository.findById(mockCustomer.id);
      expect(result).toEqual(mockCustomer);
      expect(prisma.customerProfile.findFirst).toHaveBeenCalledWith({
        where: { id: mockCustomer.id, deletedAt: null },
        include: expect.any(Object),
      });
    });

    it('should support transaction context if provided', async () => {
      const mockTx: any = { customerProfile: { findFirst: jest.fn().mockResolvedValue(mockCustomer) } };

      const result = await repository.findById(mockCustomer.id, mockTx);
      expect(result).toEqual(mockCustomer);
      expect(mockTx.customerProfile.findFirst).toHaveBeenCalled();
      expect(prisma.customerProfile.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create customer profile with version 1', async () => {
      prisma.customerProfile.create.mockResolvedValue(mockCustomer);

      const dto = {
        salonId: mockCustomer.salonId,
        primaryBranchId: mockCustomer.primaryBranchId,
        firstName: mockCustomer.firstName,
        lastName: mockCustomer.lastName,
        email: mockCustomer.email,
        phone: mockCustomer.phone,
      };

      const result = await repository.create(dto, mockCustomer.customerCode, 'usr_123');
      expect(result).toEqual(mockCustomer);
      expect(prisma.customerProfile.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should throw ConflictException on version mismatch (optimistic locking)', async () => {
      prisma.customerProfile.findFirst.mockResolvedValue(mockCustomer);

      const dto = { version: 99, firstName: 'Jane' }; // expected is 1
      await expect(repository.update(mockCustomer.id, dto, 'usr_123')).rejects.toThrow(ConflictException);
    });

    it('should update customer profile if version matches', async () => {
      prisma.customerProfile.findFirst.mockResolvedValue(mockCustomer);
      prisma.customerProfile.update.mockResolvedValue({ ...mockCustomer, firstName: 'Jane', version: 2 });

      const dto = { version: 1, firstName: 'Jane' };
      const result = await repository.update(mockCustomer.id, dto, 'usr_123');
      expect(result.firstName).toBe('Jane');
      expect(result.version).toBe(2);
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt and increment version', async () => {
      prisma.customerProfile.update.mockResolvedValue({ ...mockCustomer, deletedAt: new Date(), version: 2 });

      const result = await repository.softDelete(mockCustomer.id, 'usr_123');
      expect(result.deletedAt).toBeDefined();
      expect(prisma.customerProfile.update).toHaveBeenCalledWith({
        where: { id: mockCustomer.id },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
          version: { increment: 1 },
        }),
      });
    });
  });

  describe('search', () => {
    it('should perform paginated search and count', async () => {
      prisma.customerProfile.findMany.mockResolvedValue([mockCustomer]);
      prisma.customerProfile.count.mockResolvedValue(1);

      const result = await repository.search({ salonId: mockCustomer.salonId, search: 'John', page: 1, limit: 10 });
      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
    });
  });
});
