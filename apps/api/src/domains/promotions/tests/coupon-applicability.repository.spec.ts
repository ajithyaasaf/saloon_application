import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  CouponBranchApplicabilityRepository,
  CouponCategoryApplicabilityRepository,
  CouponCustomerEligibilityRepository,
  CouponServiceApplicabilityRepository,
} from '../repositories/coupon.repository';

describe('Coupon Applicability Repositories (Dedicated)', () => {
  let serviceAppRepo: CouponServiceApplicabilityRepository;
  let categoryAppRepo: CouponCategoryApplicabilityRepository;
  let branchAppRepo: CouponBranchApplicabilityRepository;
  let custEligRepo: CouponCustomerEligibilityRepository;

  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
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
        CouponServiceApplicabilityRepository,
        CouponCategoryApplicabilityRepository,
        CouponBranchApplicabilityRepository,
        CouponCustomerEligibilityRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    serviceAppRepo = module.get(CouponServiceApplicabilityRepository);
    categoryAppRepo = module.get(CouponCategoryApplicabilityRepository);
    branchAppRepo = module.get(CouponBranchApplicabilityRepository);
    custEligRepo = module.get(CouponCustomerEligibilityRepository);
  });

  describe('CouponServiceApplicabilityRepository', () => {
    it('should find by id and coupon', async () => {
      const byId = await serviceAppRepo.findById('csa-1');
      expect(byId).toBeDefined();
      const byCoupon = await serviceAppRepo.findByCoupon('cpn-1');
      expect(byCoupon).toHaveLength(1);
    });

    it('should find by service', async () => {
      const byService = await serviceAppRepo.findByService('srv-1');
      expect(byService).toHaveLength(1);
    });

    it('should create and delete', async () => {
      const created = await serviceAppRepo.create({ couponId: 'cpn-1', serviceId: 'srv-1' });
      expect(created).toBeDefined();
      const del = await serviceAppRepo.delete('cpn-1', 'srv-1');
      expect(del).toBeDefined();
    });
  });

  describe('CouponCategoryApplicabilityRepository', () => {
    it('should find by id, coupon, and category', async () => {
      const byId = await categoryAppRepo.findById('cca-1');
      expect(byId).toBeDefined();
      const byCat = await categoryAppRepo.findByCategory('cat-1');
      expect(byCat).toHaveLength(1);
    });

    it('should create and delete by coupon', async () => {
      const count = await categoryAppRepo.createMany([{ couponId: 'cpn-1', categoryId: 'cat-1' }]);
      expect(count).toBe(1);
      const delCount = await categoryAppRepo.deleteByCoupon('cpn-1');
      expect(delCount).toBe(1);
    });
  });

  describe('CouponBranchApplicabilityRepository', () => {
    it('should find by branch and coupon', async () => {
      const byBranch = await branchAppRepo.findByBranch('br-1');
      expect(byBranch).toHaveLength(1);
    });

    it('should delete compound record', async () => {
      const del = await branchAppRepo.delete('cpn-1', 'br-1');
      expect(del).toBeDefined();
    });
  });

  describe('CouponCustomerEligibilityRepository', () => {
    it('should check existence and find by customer', async () => {
      const exists = await custEligRepo.exists('cpn-1', 'cust-1');
      expect(exists).toBe(true);
      const byCust = await custEligRepo.findByCustomer('cust-1');
      expect(byCust).toHaveLength(1);
    });

    it('should delete customer eligibility', async () => {
      const del = await custEligRepo.delete('cpn-1', 'cust-1');
      expect(del).toBeDefined();
    });
  });
});
