import {
  CouponApplicabilityType,
  CouponCustomerEligibilityType,
  CouponDiscountType,
  CouponStatus,
} from '@prisma/client';
import { CouponEntity } from '../entities/coupon.entity';
import { CouponValidationService } from '../services/coupon-validation.service';

describe('CouponValidationService', () => {
  let service: CouponValidationService;

  const baseCoupon = new CouponEntity({
    id: 'cpn-1',
    salonId: 'sal-1',
    code: 'SAVE20',
    name: '20% Off',
    discountType: CouponDiscountType.PERCENTAGE,
    discountValue: 20,
    maxDiscountAmount: 400,
    minBookingAmount: 1000,
    minServicesCount: 1,
    applicabilityType: CouponApplicabilityType.ALL_SERVICES,
    customerEligibility: CouponCustomerEligibilityType.ALL_CUSTOMERS,
    totalUsageLimit: 100,
    perCustomerLimit: 2,
    currentUsageCount: 10,
    isAutoApply: false,
    isCombinableWithOtherOffers: false,
    isHappyHour: false,
    validDaysOfWeek: [],
    validStartTime: null,
    validEndTime: null,
    startDate: new Date('2026-01-01T00:00:00Z'),
    endDate: new Date('2026-12-31T23:59:59Z'),
    status: CouponStatus.ACTIVE,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  });

  beforeEach(() => {
    service = new CouponValidationService();
  });

  it('should validate a valid percentage coupon and cap at maxDiscountAmount', () => {
    const res = service.validateAndCalculate({
      coupon: baseCoupon,
      salonId: 'sal-1',
      branchId: 'br-1',
      customerId: 'cust-1',
      cartItems: [
        { serviceId: 'srv-1', price: 1500 },
        { serviceId: 'srv-2', price: 1500 },
      ],
      checkDate: new Date('2026-06-01T12:00:00Z'),
    });

    expect(res.isValid).toBe(true);
    expect(res.qualifyingAmount).toBe(3000);
    // 20% of 3000 = 600, but capped at maxDiscountAmount = 400
    expect(res.discountAmount).toBe(400);
  });

  it('should reject when coupon is inactive or deleted', () => {
    const inactiveCoupon = new CouponEntity({ ...baseCoupon, status: CouponStatus.PAUSED });
    const res = service.validateAndCalculate({
      coupon: inactiveCoupon,
      salonId: 'sal-1',
      branchId: 'br-1',
      customerId: 'cust-1',
      cartItems: [{ serviceId: 'srv-1', price: 2000 }],
    });

    expect(res.isValid).toBe(false);
    expect(res.reason).toContain('inactive or has been archived');
  });

  it('should reject when expired', () => {
    const res = service.validateAndCalculate({
      coupon: baseCoupon,
      salonId: 'sal-1',
      branchId: 'br-1',
      customerId: 'cust-1',
      cartItems: [{ serviceId: 'srv-1', price: 2000 }],
      checkDate: new Date('2027-01-01T00:00:00Z'),
    });

    expect(res.isValid).toBe(false);
    expect(res.reason).toContain('expired');
  });

  it('should reject on tenant mismatch', () => {
    const res = service.validateAndCalculate({
      coupon: baseCoupon,
      salonId: 'other-sal',
      branchId: 'br-1',
      customerId: 'cust-1',
      cartItems: [{ serviceId: 'srv-1', price: 2000 }],
    });

    expect(res.isValid).toBe(false);
    expect(res.reason).toContain('not valid for this salon');
  });

  it('should reject when total usage quota reached', () => {
    const depletedCoupon = new CouponEntity({ ...baseCoupon, currentUsageCount: 100 });
    const res = service.validateAndCalculate({
      coupon: depletedCoupon,
      salonId: 'sal-1',
      branchId: 'br-1',
      customerId: 'cust-1',
      cartItems: [{ serviceId: 'srv-1', price: 2000 }],
    });

    expect(res.isValid).toBe(false);
    expect(res.reason).toContain('total redemption limit');
  });

  it('should reject when customer usage limit reached', () => {
    const res = service.validateAndCalculate({
      coupon: baseCoupon,
      salonId: 'sal-1',
      branchId: 'br-1',
      customerId: 'cust-1',
      customerUsageCount: 2,
      cartItems: [{ serviceId: 'srv-1', price: 2000 }],
    });

    expect(res.isValid).toBe(false);
    expect(res.reason).toContain('Customer limit reached');
  });

  it('should enforce first-time customer eligibility', () => {
    const firstTimeCoupon = new CouponEntity({
      ...baseCoupon,
      customerEligibility: CouponCustomerEligibilityType.FIRST_TIME_ONLY,
    });

    const resReturning = service.validateAndCalculate({
      coupon: firstTimeCoupon,
      salonId: 'sal-1',
      branchId: 'br-1',
      customerId: 'cust-1',
      customerBookingCount: 3,
      cartItems: [{ serviceId: 'srv-1', price: 2000 }],
    });
    expect(resReturning.isValid).toBe(false);
    expect(resReturning.reason).toContain('first-time customers');

    const resFirstTime = service.validateAndCalculate({
      coupon: firstTimeCoupon,
      salonId: 'sal-1',
      branchId: 'br-1',
      customerId: 'cust-1',
      customerBookingCount: 0,
      cartItems: [{ serviceId: 'srv-1', price: 2000 }],
    });
    expect(resFirstTime.isValid).toBe(true);
  });

  it('should enforce specific service applicability', () => {
    const specificServiceCoupon = new CouponEntity({
      ...baseCoupon,
      applicabilityType: CouponApplicabilityType.SPECIFIC_SERVICES,
      serviceApplicabilities: [{ id: 'sa-1', couponId: 'cpn-1', serviceId: 'srv-1' }],
    });

    const res = service.validateAndCalculate({
      coupon: specificServiceCoupon,
      salonId: 'sal-1',
      branchId: 'br-1',
      customerId: 'cust-1',
      cartItems: [
        { serviceId: 'srv-1', price: 1200 },
        { serviceId: 'srv-2', price: 800 },
      ],
    });

    expect(res.isValid).toBe(true);
    expect(res.eligibleItems).toHaveLength(1);
    expect(res.qualifyingAmount).toBe(1200);
    expect(res.discountAmount).toBe(240); // 20% of 1200
  });

  it('should calculate fixed amount discount correctly', () => {
    const fixedCoupon = new CouponEntity({
      ...baseCoupon,
      discountType: CouponDiscountType.FIXED_AMOUNT,
      discountValue: 500,
    });

    const res = service.validateAndCalculate({
      coupon: fixedCoupon,
      salonId: 'sal-1',
      branchId: 'br-1',
      customerId: 'cust-1',
      cartItems: [{ serviceId: 'srv-1', price: 1500 }],
    });

    expect(res.isValid).toBe(true);
    expect(res.discountAmount).toBe(500);
  });

  it('should calculate free service discount for the lowest qualifying item', () => {
    const freeServiceCoupon = new CouponEntity({
      ...baseCoupon,
      discountType: CouponDiscountType.FREE_SERVICE,
    });

    const res = service.validateAndCalculate({
      coupon: freeServiceCoupon,
      salonId: 'sal-1',
      branchId: 'br-1',
      customerId: 'cust-1',
      cartItems: [
        { serviceId: 'srv-1', price: 1500 },
        { serviceId: 'srv-2', price: 700 },
      ],
    });

    expect(res.isValid).toBe(true);
    expect(res.discountAmount).toBe(700);
  });

  it('should reject when cart total is below minBookingAmount', () => {
    const res = service.validateAndCalculate({
      coupon: baseCoupon,
      salonId: 'sal-1',
      branchId: 'br-1',
      customerId: 'cust-1',
      cartItems: [{ serviceId: 'srv-1', price: 500 }], // minBookingAmount is 1000
    });

    expect(res.isValid).toBe(false);
    expect(res.reason).toContain('Minimum booking amount');
  });
});
