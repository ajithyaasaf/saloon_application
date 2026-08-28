import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from '../../../shared/cache/cache.service';
import {
  CouponBranchApplicabilityRepository,
  CouponCategoryApplicabilityRepository,
  CouponCustomerEligibilityRepository,
  CouponRepository,
  CouponServiceApplicabilityRepository,
} from '../repositories/coupon.repository';
import { CouponApplicabilityService } from '../services/coupon-applicability.service';

describe('CouponApplicabilityService', () => {
  let service: CouponApplicabilityService;
  let couponRepo: jest.Mocked<CouponRepository>;
  let serviceAppRepo: jest.Mocked<CouponServiceApplicabilityRepository>;
  let categoryAppRepo: jest.Mocked<CouponCategoryApplicabilityRepository>;
  let branchAppRepo: jest.Mocked<CouponBranchApplicabilityRepository>;
  let custEligRepo: jest.Mocked<CouponCustomerEligibilityRepository>;
  let cacheService: jest.Mocked<CacheService>;

  beforeEach(async () => {
    const mockCouponRepo = {
      findById: jest.fn().mockResolvedValue({ id: 'cpn-1', salonId: 'sal-1' }),
    };
    const mockServiceAppRepo = {
      deleteByCoupon: jest.fn().mockResolvedValue(1),
      createMany: jest.fn().mockResolvedValue(2),
      findByCoupon: jest.fn().mockResolvedValue([{ id: 'csa-1', couponId: 'cpn-1', serviceId: 'srv-1' }]),
    };
    const mockCategoryAppRepo = {
      deleteByCoupon: jest.fn().mockResolvedValue(1),
      createMany: jest.fn().mockResolvedValue(1),
      findByCoupon: jest.fn().mockResolvedValue([{ id: 'cca-1', couponId: 'cpn-1', categoryId: 'cat-1' }]),
    };
    const mockBranchAppRepo = {
      deleteByCoupon: jest.fn().mockResolvedValue(1),
      createMany: jest.fn().mockResolvedValue(1),
      findByCoupon: jest.fn().mockResolvedValue([{ id: 'cba-1', couponId: 'cpn-1', branchId: 'br-1' }]),
    };
    const mockCustEligRepo = {
      deleteByCoupon: jest.fn().mockResolvedValue(1),
      createMany: jest.fn().mockResolvedValue(1),
      findByCoupon: jest.fn().mockResolvedValue([{ id: 'cce-1', couponId: 'cpn-1', customerId: 'cust-1' }]),
    };
    const mockCache = { delete: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponApplicabilityService,
        { provide: CouponRepository, useValue: mockCouponRepo },
        { provide: CouponServiceApplicabilityRepository, useValue: mockServiceAppRepo },
        { provide: CouponCategoryApplicabilityRepository, useValue: mockCategoryAppRepo },
        { provide: CouponBranchApplicabilityRepository, useValue: mockBranchAppRepo },
        { provide: CouponCustomerEligibilityRepository, useValue: mockCustEligRepo },
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();

    service = module.get(CouponApplicabilityService);
    couponRepo = module.get(CouponRepository);
    serviceAppRepo = module.get(CouponServiceApplicabilityRepository);
    categoryAppRepo = module.get(CouponCategoryApplicabilityRepository);
    branchAppRepo = module.get(CouponBranchApplicabilityRepository);
    custEligRepo = module.get(CouponCustomerEligibilityRepository);
    cacheService = module.get(CacheService);
  });

  it('should set service applicabilities and invalidate cache', async () => {
    const res = await service.setServiceApplicabilities('cpn-1', ['srv-1', 'srv-2'], 'sal-1');
    expect(res).toHaveLength(1);
    expect(serviceAppRepo.deleteByCoupon).toHaveBeenCalledWith('cpn-1');
    expect(serviceAppRepo.createMany).toHaveBeenCalledWith([
      { couponId: 'cpn-1', serviceId: 'srv-1' },
      { couponId: 'cpn-1', serviceId: 'srv-2' },
    ]);
    expect(cacheService.delete).toHaveBeenCalledWith('coupon:cpn-1');
  });

  it('should throw NotFoundException if coupon does not exist', async () => {
    couponRepo.findById.mockResolvedValueOnce(null);
    await expect(
      service.setServiceApplicabilities('invalid-cpn', ['srv-1']),
    ).rejects.toThrow(NotFoundException);
  });

  it('should set branch applicabilities', async () => {
    const res = await service.setBranchApplicabilities('cpn-1', ['br-1'], 'sal-1');
    expect(res).toHaveLength(1);
    expect(branchAppRepo.deleteByCoupon).toHaveBeenCalledWith('cpn-1');
  });

  it('should set category applicabilities', async () => {
    const res = await service.setCategoryApplicabilities('cpn-1', ['cat-1'], 'sal-1');
    expect(res).toHaveLength(1);
    expect(categoryAppRepo.deleteByCoupon).toHaveBeenCalledWith('cpn-1');
  });

  it('should set customer eligibilities', async () => {
    const res = await service.setCustomerEligibilities('cpn-1', ['cust-1'], 'sal-1');
    expect(res).toHaveLength(1);
    expect(custEligRepo.deleteByCoupon).toHaveBeenCalledWith('cpn-1');
  });

  it('should get all applicabilities for a coupon', async () => {
    const all = await service.getApplicabilitiesForCoupon('cpn-1', 'sal-1');
    expect(all.services).toHaveLength(1);
    expect(all.categories).toHaveLength(1);
    expect(all.branches).toHaveLength(1);
    expect(all.customers).toHaveLength(1);
  });
});
