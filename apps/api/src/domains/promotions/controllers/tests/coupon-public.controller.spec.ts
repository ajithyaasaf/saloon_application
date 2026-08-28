import { Test, TestingModule } from '@nestjs/testing';
import { CouponDiscountType, CouponStatus } from '@prisma/client';
import { CouponEntity } from '../../entities/coupon.entity';
import { CouponService } from '../../services/coupon.service';
import { CouponPublicController } from '../coupon-public.controller';

describe('CouponPublicController', () => {
  let controller: CouponPublicController;
  let couponService: jest.Mocked<CouponService>;

  const mockCoupon = new CouponEntity({
    id: 'cpn-1',
    code: 'PUBLIC20',
    name: 'Public 20% Off',
    description: 'Special coupon',
    discountType: CouponDiscountType.PERCENTAGE,
    discountValue: 20,
    minBookingAmount: 500,
    minServicesCount: 1,
    isAutoApply: false,
    isHappyHour: false,
    validDaysOfWeek: [],
    startDate: new Date(Date.now() - 86400000),
    endDate: new Date(Date.now() + 86400000 * 10),
    status: CouponStatus.ACTIVE,
  });

  beforeEach(async () => {
    const mockService = {
      searchCoupons: jest.fn().mockResolvedValue({ data: [mockCoupon], total: 1 }),
      findActiveBySalon: jest.fn().mockResolvedValue([mockCoupon]),
      getCouponById: jest.fn().mockResolvedValue(mockCoupon),
      validateCouponForCheckout: jest.fn().mockResolvedValue({
        isValid: true,
        discountAmount: 200,
        qualifyingAmount: 1000,
        eligibleItems: [{ serviceId: 'srv-1', price: 1000, discount: 200 }],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CouponPublicController],
      providers: [{ provide: CouponService, useValue: mockService }],
    }).compile();

    controller = module.get<CouponPublicController>(CouponPublicController);
    couponService = module.get(CouponService);
  });

  it('should search public active coupons and sanitize output', async () => {
    const res = await controller.searchCoupons({ page: 1, limit: 10 });
    expect(res.data).toHaveLength(1);
    expect(res.data[0].code).toBe('PUBLIC20');
    expect(res.data[0]).not.toHaveProperty('deletedAt');
    expect(couponService.searchCoupons).toHaveBeenCalledWith(
      expect.objectContaining({ status: CouponStatus.ACTIVE }),
    );
  });

  it('should get active coupons for a salon', async () => {
    const res = await controller.getActiveCoupons('sal-1');
    expect(res.data).toHaveLength(1);
    expect(couponService.findActiveBySalon).toHaveBeenCalledWith('sal-1');
  });

  it('should get coupon by id', async () => {
    const res = await controller.getCouponById('cpn-1');
    expect(res.data.id).toBe('cpn-1');
  });

  it('should validate coupon code for checkout', async () => {
    const res = await controller.validateCoupon({
      code: 'PUBLIC20',
      salonId: 'sal-1',
      cartItems: [{ serviceId: 'srv-1', price: 1000 }],
    });

    expect(res.data.isValid).toBe(true);
    expect(res.data.discountAmount).toBe(200);
  });
});
