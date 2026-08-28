import { Test, TestingModule } from '@nestjs/testing';
import { MembershipStatus } from '@prisma/client';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CustomerMembershipRepository } from '../repositories/customer-membership.repository';

describe('CustomerMembershipRepository', () => {
  let repository: CustomerMembershipRepository;
  let prisma: any;

  const mockMembership = {
    id: 'mem_123',
    customerProfileId: 'cust_123',
    membershipPlanId: 'plan_123',
    status: MembershipStatus.ACTIVE,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    pricePaid: 500000,
    discountPercentage: 15,
    autoRenew: false,
    version: 1,
    createdByUserId: 'usr_123',
    updatedByUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    prisma = {
      customerMembership: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerMembershipRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<CustomerMembershipRepository>(CustomerMembershipRepository);
  });

  describe('findActiveMembership', () => {
    it('should query active non-deleted membership with valid end date', async () => {
      prisma.customerMembership.findFirst.mockResolvedValue(mockMembership);

      const result = await repository.findActiveMembership('cust_123');
      expect(result).toEqual(mockMembership);
      expect(prisma.customerMembership.findFirst).toHaveBeenCalledWith({
        where: {
          customerProfileId: 'cust_123',
          status: 'ACTIVE',
          endDate: { gte: expect.any(Date) },
          deletedAt: null,
        },
        include: { membershipPlan: true },
        orderBy: { endDate: 'desc' },
      });
    });
  });

  describe('update', () => {
    it('should enforce optimistic concurrency version check', async () => {
      prisma.customerMembership.findFirst.mockResolvedValue(mockMembership);

      await expect(
        repository.update('mem_123', { version: 5, status: MembershipStatus.CANCELLED }, 'usr_123'),
      ).rejects.toThrow(ConflictException);
    });
  });
});
