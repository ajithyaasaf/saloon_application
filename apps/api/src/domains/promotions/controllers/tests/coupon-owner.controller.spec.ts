import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CouponApplicabilityType, CouponCustomerEligibilityType, CouponDiscountType, CouponStatus, CouponUsageStatus } from '@prisma/client';
import { CouponUsageEntity } from '../../entities/coupon-usage.entity';
import { CouponEntity } from '../../entities/coupon.entity';
import { CouponApplicabilityService } from '../../services/coupon-applicability.service';
import { CouponUsageService } from '../../services/coupon-usage.service';
import { CouponService } from '../../services/coupon.service';
import { CouponOwnerController } from '../coupon-owner.controller';

describe('CouponOwnerController', () => {
  let controller: CouponOwnerController;
  let couponService: jest.Mocked<CouponService>;
  let applicabilityService: jest.Mocked<CouponApplicabilityService>;
  let usageService: jest.Mocked<CouponUsageService>;

  const mockOwnerUser = { id: 'owner-1', salonId: 'sal-1', roles: ['SALON_OWNER'] };

  const mockCoupon = new CouponEntity({
    id: 'cpn-1',
    salonId: 'sal-1',
    code: 'OWNER25',
    name: 'Owner 25% Off',
    discountType: CouponDiscountType.PERCENTAGE,
    discountValue: 25,
    minBookingAmount: 1000,
    minServicesCount: 1,
    applicabilityType: CouponApplicabilityType.ALL_SERVICES,
    customerEligibility: CouponCustomerEligibilityType.ALL_CUSTOMERS,
    totalUsageLimit: 100,
    perCustomerLimit: 1,
    currentUsageCount: 5,
    isAutoApply: false,
    isCombinableWithOtherOffers: false,
    isHappyHour: false,
    validDaysOfWeek: [],
    startDate: new Date('2026-06-01'),
    endDate: new Date('2026-06-30'),
    status: CouponStatus.ACTIVE,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mockUsage = new CouponUsageEntity({
    id: 'usg-1',
    couponId: 'cpn-1',
    salonId: 'sal-1',
    branchId: 'br-1',
    customerId: 'cust-1',
    discountAmount: 250,
    bookingTotalBeforeDiscount: 1000,
    bookingTotalAfterDiscount: 750,
    status: CouponUsageStatus.APPLIED,
    appliedAt: new Date(),
    createdAt: new Date(),
  });

  beforeEach(async () => {
    const mockCouponService = {
      createCoupon: jest.fn().mockResolvedValue(mockCoupon),
      searchCoupons: jest.fn().mockResolvedValue({ data: [mockCoupon], total: 1 }),
      getCouponById: jest.fn().mockResolvedValue(mockCoupon),
      updateCoupon: jest.fn().mockResolvedValue(new CouponEntity({ ...mockCoupon, name: 'Updated Name' })),
      activateCoupon: jest.fn().mockResolvedValue(new CouponEntity({ ...mockCoupon, status: CouponStatus.ACTIVE })),
      pauseCoupon: jest.fn().mockResolvedValue(new CouponEntity({ ...mockCoupon, status: CouponStatus.PAUSED })),
      archiveCoupon: jest.fn().mockResolvedValue(new CouponEntity({ ...mockCoupon, status: CouponStatus.ARCHIVED })),
    };

    const mockAppService = {
      setServiceApplicabilities: jest.fn().mockResolvedValue([]),
      setCategoryApplicabilities: jest.fn().mockResolvedValue([]),
      setBranchApplicabilities: jest.fn().mockResolvedValue([]),
      setCustomerEligibilities: jest.fn().mockResolvedValue([]),
      getApplicabilitiesForCoupon: jest.fn().mockResolvedValue({
        services: [],
        categories: [],
        branches: [],
        customers: [],
      }),
    };

    const mockUsageService = {
      searchUsages: jest.fn().mockResolvedValue({ data: [mockUsage], total: 1 }),
      aggregateUsage: jest.fn().mockResolvedValue({ totalUsages: 5, totalDiscountGiven: 1250 }),
      settleCouponUsage: jest.fn().mockResolvedValue(new CouponUsageEntity({ ...mockUsage, status: CouponUsageStatus.SETTLED })),
      reverseCouponUsage: jest.fn().mockResolvedValue(new CouponUsageEntity({ ...mockUsage, status: CouponUsageStatus.REVERSED })),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CouponOwnerController],
      providers: [
        { provide: CouponService, useValue: mockCouponService },
        { provide: CouponApplicabilityService, useValue: mockAppService },
        { provide: CouponUsageService, useValue: mockUsageService },
      ],
    }).compile();

    controller = module.get<CouponOwnerController>(CouponOwnerController);
    couponService = module.get(CouponService);
    applicabilityService = module.get(CouponApplicabilityService);
    usageService = module.get(CouponUsageService);
  });

  it('should create coupon with authenticated salonId', async () => {
    const res = await controller.createCoupon(mockOwnerUser, {
      code: 'OWNER25',
      name: 'Owner 25% Off',
      discountType: CouponDiscountType.PERCENTAGE,
      discountValue: 25,
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-30'),
    });

    expect(res.data.code).toBe('OWNER25');
    expect(couponService.createCoupon).toHaveBeenCalledWith(
      expect.objectContaining({ salonId: 'sal-1' }),
      'owner-1',
    );
  });

  it('should fail if user has no salonId context', async () => {
    await expect(
      controller.createCoupon({ id: 'owner-no-salon' }, {
        code: 'OWNER25',
        name: 'Owner 25% Off',
        discountType: CouponDiscountType.PERCENTAGE,
        discountValue: 25,
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-30'),
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should activate and pause coupon', async () => {
    const act = await controller.activateCoupon(mockOwnerUser, 'cpn-1', 1);
    expect(act.data.status).toBe(CouponStatus.ACTIVE);
    expect(couponService.activateCoupon).toHaveBeenCalledWith('cpn-1', 'sal-1', 1, 'owner-1');

    const pause = await controller.pauseCoupon(mockOwnerUser, 'cpn-1', 1);
    expect(pause.data.status).toBe(CouponStatus.PAUSED);
  });

  it('should configure applicabilities for coupon', async () => {
    const res = await controller.setApplicabilities(mockOwnerUser, 'cpn-1', {
      serviceIds: ['srv-1'],
      branchIds: ['br-1'],
    });

    expect(res.data).toBeDefined();
    expect(applicabilityService.setServiceApplicabilities).toHaveBeenCalledWith(
      'cpn-1',
      ['srv-1'],
      'sal-1',
    );
  });

  it('should settle and reverse coupon usage', async () => {
    const settled = await controller.settleUsage(mockOwnerUser, 'usg-1', { invoiceId: 'inv-1' });
    expect(settled.data.status).toBe(CouponUsageStatus.SETTLED);

    const reversed = await controller.reverseUsage(mockOwnerUser, 'usg-1', {
      reversalReason: 'Cancelled appointment',
    });
    expect(reversed.data.status).toBe(CouponUsageStatus.REVERSED);
  });
});
