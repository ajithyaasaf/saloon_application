import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CouponApplicabilityType, CouponCustomerEligibilityType, CouponDiscountType, CouponStatus, CouponUsageStatus } from '@prisma/client';
import { CouponUsageEntity } from '../../entities/coupon-usage.entity';
import { CouponEntity } from '../../entities/coupon.entity';
import { CouponUsageService } from '../../services/coupon-usage.service';
import { CouponService } from '../../services/coupon.service';
import { CouponCustomerController } from '../coupon-customer.controller';

describe('CouponCustomerController', () => {
  let controller: CouponCustomerController;
  let couponService: jest.Mocked<CouponService>;
  let usageService: jest.Mocked<CouponUsageService>;

  const mockUser = { id: 'cust-123', roles: ['CUSTOMER'] };

  const mockCoupon = new CouponEntity({
    id: 'cpn-1',
    salonId: 'sal-1',
    code: 'SAVE100',
    name: 'Save 100',
    discountType: CouponDiscountType.FIXED_AMOUNT,
    discountValue: 100,
    minBookingAmount: 500,
    minServicesCount: 1,
    applicabilityType: CouponApplicabilityType.ALL_SERVICES,
    customerEligibility: CouponCustomerEligibilityType.ALL_CUSTOMERS,
    perCustomerLimit: 2,
    isAutoApply: false,
    isCombinableWithOtherOffers: false,
    isHappyHour: false,
    validDaysOfWeek: [],
    startDate: new Date(Date.now() - 86400000),
    endDate: new Date(Date.now() + 86400000 * 10),
    status: CouponStatus.ACTIVE,
  });

  const mockUsage = new CouponUsageEntity({
    id: 'usg-1',
    couponId: 'cpn-1',
    salonId: 'sal-1',
    branchId: 'br-1',
    customerId: 'cust-123',
    bookingId: 'bk-1',
    discountAmount: 100,
    bookingTotalBeforeDiscount: 1000,
    bookingTotalAfterDiscount: 900,
    status: CouponUsageStatus.APPLIED,
    appliedAt: new Date(),
    createdAt: new Date(),
  });

  beforeEach(async () => {
    const mockCouponService = {
      getCouponByCode: jest.fn().mockResolvedValue(mockCoupon),
      findActiveBySalon: jest.fn().mockResolvedValue([mockCoupon]),
      validateCouponForCheckout: jest.fn().mockResolvedValue({
        isValid: true,
        discountAmount: 100,
        qualifyingAmount: 1000,
        eligibleItems: [{ serviceId: 'srv-1', price: 1000, discount: 100 }],
      }),
    };

    const mockUsageService = {
      applyCoupon: jest.fn().mockResolvedValue(mockUsage),
      searchUsages: jest.fn().mockResolvedValue({ data: [mockUsage], total: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CouponCustomerController],
      providers: [
        { provide: CouponService, useValue: mockCouponService },
        { provide: CouponUsageService, useValue: mockUsageService },
      ],
    }).compile();

    controller = module.get<CouponCustomerController>(CouponCustomerController);
    couponService = module.get(CouponService);
    usageService = module.get(CouponUsageService);
  });

  it('should validate coupon for authenticated customer', async () => {
    const res = await controller.validateCoupon(mockUser, {
      code: 'SAVE100',
      branchId: 'br-1',
      cartItems: [{ serviceId: 'srv-1', price: 1000 }],
    });

    expect(res.data.isValid).toBe(true);
    expect(res.data.discountAmount).toBe(100);
    expect(couponService.validateCouponForCheckout).toHaveBeenCalledWith(
      'SAVE100',
      expect.objectContaining({ customerId: 'cust-123' }),
    );
  });

  it('should apply coupon and create atomic usage', async () => {
    const res = await controller.applyCoupon(mockUser, {
      code: 'SAVE100',
      branchId: 'br-1',
      bookingId: 'bk-1',
      cartItems: [{ serviceId: 'srv-1', price: 1000 }],
    });

    expect(res.data.id).toBe('usg-1');
    expect(res.data.discountAmount).toBe(100);
    expect(usageService.applyCoupon).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'cust-123',
        couponId: 'cpn-1',
        discountAmount: 100,
      }),
      'cust-123',
    );
  });

  it('should reject apply coupon if validation fails', async () => {
    couponService.validateCouponForCheckout.mockResolvedValueOnce({
      isValid: false,
      reason: 'Minimum booking amount not reached',
      discountAmount: 0,
      qualifyingAmount: 0,
      eligibleItems: [],
    });

    await expect(
      controller.applyCoupon(mockUser, {
        code: 'SAVE100',
        branchId: 'br-1',
        cartItems: [{ serviceId: 'srv-1', price: 100 }],
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should list customer own coupon usages enforcing customer ID', async () => {
    const res = await controller.getMyCouponUsages(mockUser, { page: 1, limit: 10 });
    expect(res.data).toHaveLength(1);
    expect(usageService.searchUsages).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 'cust-123' }),
    );
  });
});
