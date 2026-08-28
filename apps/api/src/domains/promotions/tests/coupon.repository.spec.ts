import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CouponApplicabilityType, CouponCustomerEligibilityType, CouponDiscountType, CouponStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  CouponBranchApplicabilityRepository,
  CouponCategoryApplicabilityRepository,
  CouponCustomerEligibilityRepository,
  CouponRepository,
  CouponServiceApplicabilityRepository,
} from '../repositories/coupon.repository';

describe('CouponRepository & Applicability Repositories', () => {
  let couponRepo: CouponRepository;
  let serviceAppRepo: CouponServiceApplicabilityRepository;
  let categoryAppRepo: CouponCategoryApplicabilityRepository;
  let branchAppRepo: CouponBranchApplicabilityRepository;
  let custEligRepo: CouponCustomerEligibilityRepository;

  let mockPrisma: any;

  const mockCoupon = {
    id: 'cpn-1',
    salonId: 'sal-1',
    code: 'WELCOME20',
    name: '20% Off Welcome Discount',
    description: 'First time user promo',
    discountType: CouponDiscountType.PERCENTAGE,
    discountValue: 20,
    maxDiscountAmount: 500,
    minBookingAmount: 1000,
    minServicesCount: 1,
    applicabilityType: CouponApplicabilityType.ALL_SERVICES,
    customerEligibility: CouponCustomerEligibilityType.FIRST_TIME_ONLY,
    totalUsageLimit: 100,
    perCustomerLimit: 1,
    currentUsageCount: 5,
    isAutoApply: false,
    isCombinableWithOtherOffers: false,
    isHappyHour: false,
    validDaysOfWeek: [1, 2, 3, 4],
    validStartTime: '11:00:00',
    validEndTime: '15:00:00',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    status: CouponStatus.ACTIVE,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    mockPrisma = {
      coupon: {
        findFirst: jest.fn().mockResolvedValue(mockCoupon),
        findMany: jest.fn().mockResolvedValue([mockCoupon]),
        findUnique: jest.fn().mockResolvedValue(mockCoupon),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue(mockCoupon),
        update: jest.fn().mockResolvedValue({ ...mockCoupon, version: 2 }),
      },
      couponServiceApplicability: {
        findUnique: jest.fn().mockResolvedValue({ id: 'csa-1', couponId: 'cpn-1', serviceId: 'srv-1' }),
        findMany: jest.fn().mockResolvedValue([{ id: 'csa-1', couponId: 'cpn-1', serviceId: 'srv-1' }]),
        create: jest.fn().mockResolvedValue({ id: 'csa-1', couponId: 'cpn-1', serviceId: 'srv-1' }),
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
        delete: jest.fn().mockResolvedValue({ id: 'csa-1' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      couponCategoryApplicability: {
        findUnique: jest.fn().mockResolvedValue({ id: 'cca-1', couponId: 'cpn-1', categoryId: 'cat-1' }),
        findMany: jest.fn().mockResolvedValue([{ id: 'cca-1', couponId: 'cpn-1', categoryId: 'cat-1' }]),
        create: jest.fn().mockResolvedValue({ id: 'cca-1', couponId: 'cpn-1', categoryId: 'cat-1' }),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        delete: jest.fn().mockResolvedValue({ id: 'cca-1' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      couponBranchApplicability: {
        findUnique: jest.fn().mockResolvedValue({ id: 'cba-1', couponId: 'cpn-1', branchId: 'br-1' }),
        findMany: jest.fn().mockResolvedValue([{ id: 'cba-1', couponId: 'cpn-1', branchId: 'br-1' }]),
        create: jest.fn().mockResolvedValue({ id: 'cba-1', couponId: 'cpn-1', branchId: 'br-1' }),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        delete: jest.fn().mockResolvedValue({ id: 'cba-1' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      couponCustomerEligibility: {
        findUnique: jest.fn().mockResolvedValue({ id: 'cce-1', couponId: 'cpn-1', customerId: 'cust-1' }),
        findMany: jest.fn().mockResolvedValue([{ id: 'cce-1', couponId: 'cpn-1', customerId: 'cust-1' }]),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue({ id: 'cce-1', couponId: 'cpn-1', customerId: 'cust-1' }),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        delete: jest.fn().mockResolvedValue({ id: 'cce-1' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponRepository,
        CouponServiceApplicabilityRepository,
        CouponCategoryApplicabilityRepository,
        CouponBranchApplicabilityRepository,
        CouponCustomerEligibilityRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    couponRepo = module.get<CouponRepository>(CouponRepository);
    serviceAppRepo = module.get<CouponServiceApplicabilityRepository>(CouponServiceApplicabilityRepository);
    categoryAppRepo = module.get<CouponCategoryApplicabilityRepository>(CouponCategoryApplicabilityRepository);
    branchAppRepo = module.get<CouponBranchApplicabilityRepository>(CouponBranchApplicabilityRepository);
    custEligRepo = module.get<CouponCustomerEligibilityRepository>(CouponCustomerEligibilityRepository);
  });

  describe('CouponRepository', () => {
    it('should find coupon by id with salon isolation', async () => {
      const res = await couponRepo.findById('cpn-1', 'sal-1');
      expect(res).toEqual(mockCoupon);
      expect(mockPrisma.coupon.findFirst).toHaveBeenCalledWith({
        where: { id: 'cpn-1', salonId: 'sal-1', deletedAt: null },
        include: expect.any(Object),
      });
    });

    it('should find active coupon by code', async () => {
      const checkDate = new Date('2026-06-01');
      const res = await couponRepo.findActiveByCode('welcome20', 'sal-1', checkDate);
      expect(res).toEqual(mockCoupon);
      expect(mockPrisma.coupon.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          code: 'WELCOME20',
          status: CouponStatus.ACTIVE,
        }),
        include: expect.any(Object),
      });
    });

    it('should search coupons with pagination', async () => {
      const res = await couponRepo.search({ salonId: 'sal-1', page: 1, limit: 10 });
      expect(res.data).toHaveLength(1);
      expect(res.total).toBe(1);
    });

    it('should create a coupon', async () => {
      const res = await couponRepo.create({
        salonId: 'sal-1',
        code: 'SUMMER30',
        name: 'Summer 30%',
        discountType: CouponDiscountType.PERCENTAGE,
        discountValue: 30,
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-30'),
      });
      expect(res).toEqual(mockCoupon);
      expect(mockPrisma.coupon.create).toHaveBeenCalled();
    });

    it('should update coupon with optimistic locking and throw ConflictException on mismatch', async () => {
      mockPrisma.coupon.update.mockRejectedValueOnce({ code: 'P2025' });

      await expect(
        couponRepo.update('cpn-1', { name: 'Updated Name' }, 1),
      ).rejects.toThrow(ConflictException);
    });

    it('should increment usage atomically', async () => {
      await couponRepo.incrementUsage('cpn-1', 1, 1);
      expect(mockPrisma.coupon.update).toHaveBeenCalledWith({
        where: { id: 'cpn-1', version: 1 },
        data: {
          currentUsageCount: { increment: 1 },
          version: { increment: 1 },
        },
      });
    });

    it('should soft delete coupon and archive status', async () => {
      await couponRepo.softDelete('cpn-1', 'sal-1');
      expect(mockPrisma.coupon.update).toHaveBeenCalledWith({
        where: { id: 'cpn-1' },
        data: expect.objectContaining({
          status: CouponStatus.ARCHIVED,
        }),
      });
    });

    it('should check if code exists', async () => {
      const exists = await couponRepo.checkCodeExists('WELCOME20', 'sal-1');
      expect(exists).toBe(true);
    });
  });

  describe('Applicability Repositories', () => {
    it('should manage service applicabilities', async () => {
      const created = await serviceAppRepo.create({ couponId: 'cpn-1', serviceId: 'srv-1' });
      expect(created).toBeDefined();
      const list = await serviceAppRepo.findByCoupon('cpn-1');
      expect(list).toHaveLength(1);
      const del = await serviceAppRepo.delete('cpn-1', 'srv-1');
      expect(del).toBeDefined();
    });

    it('should manage category applicabilities', async () => {
      const created = await categoryAppRepo.create({ couponId: 'cpn-1', categoryId: 'cat-1' });
      expect(created).toBeDefined();
      const list = await categoryAppRepo.findByCoupon('cpn-1');
      expect(list).toHaveLength(1);
    });

    it('should manage branch applicabilities', async () => {
      const created = await branchAppRepo.create({ couponId: 'cpn-1', branchId: 'br-1' });
      expect(created).toBeDefined();
      const list = await branchAppRepo.findByCoupon('cpn-1');
      expect(list).toHaveLength(1);
    });

    it('should check and manage customer eligibility', async () => {
      const exists = await custEligRepo.exists('cpn-1', 'cust-1');
      expect(exists).toBe(true);
      const created = await custEligRepo.create({ couponId: 'cpn-1', customerId: 'cust-1' });
      expect(created).toBeDefined();
    });
  });
});
