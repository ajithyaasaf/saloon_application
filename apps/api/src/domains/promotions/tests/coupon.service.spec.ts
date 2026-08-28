import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CouponApplicabilityType, CouponCustomerEligibilityType, CouponDiscountType, CouponStatus, Prisma } from '@prisma/client';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { CouponEntity } from '../entities/coupon.entity';
import { CouponUsageRepository } from '../repositories/coupon-usage.repository';
import { CouponRepository } from '../repositories/coupon.repository';
import { CouponValidationService } from '../services/coupon-validation.service';
import { CouponService } from '../services/coupon.service';

describe('CouponService', () => {
  let service: CouponService;
  let couponRepo: jest.Mocked<CouponRepository>;
  let couponUsageRepo: jest.Mocked<CouponUsageRepository>;
  let auditService: jest.Mocked<AuditService>;
  let cacheService: jest.Mocked<CacheService>;
  let eventBus: jest.Mocked<EventBusService>;

  const mockCoupon: any = {
    id: 'cpn-1',
    salonId: 'sal-1',
    code: 'FESTIVE25',
    name: 'Festive 25% Off',
    description: 'Special seasonal promotion',
    discountType: CouponDiscountType.PERCENTAGE,
    discountValue: new Prisma.Decimal(25),
    maxDiscountAmount: 500,
    minBookingAmount: 1000,
    minServicesCount: 1,
    applicabilityType: CouponApplicabilityType.ALL_SERVICES,
    customerEligibility: CouponCustomerEligibilityType.ALL_CUSTOMERS,
    totalUsageLimit: 100,
    perCustomerLimit: 1,
    currentUsageCount: 0,
    isAutoApply: false,
    isCombinableWithOtherOffers: false,
    isHappyHour: false,
    validDaysOfWeek: [],
    validStartTime: null,
    validEndTime: null,
    startDate: new Date('2026-06-01'),
    endDate: new Date('2026-06-30'),
    status: CouponStatus.ACTIVE,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const mockRepo = {
      checkCodeExists: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockResolvedValue(mockCoupon),
      findById: jest.fn().mockResolvedValue(mockCoupon),
      findByCode: jest.fn().mockResolvedValue(mockCoupon),
      findActiveByCode: jest.fn().mockResolvedValue(mockCoupon),
      findActiveBySalon: jest.fn().mockResolvedValue([mockCoupon]),
      findAutoApplyCoupons: jest.fn().mockResolvedValue([mockCoupon]),
      update: jest.fn().mockResolvedValue({ ...mockCoupon, status: CouponStatus.ACTIVE }),
      updateStatus: jest.fn().mockResolvedValue({ ...mockCoupon, status: CouponStatus.ACTIVE }),
      softDelete: jest.fn().mockResolvedValue({ ...mockCoupon, deletedAt: new Date(), status: CouponStatus.ARCHIVED }),
      search: jest.fn().mockResolvedValue({ data: [mockCoupon], total: 1 }),
    };

    const mockUsageRepo = {
      countCustomerUsage: jest.fn().mockResolvedValue(0),
    };

    const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };
    const mockCache = { delete: jest.fn().mockResolvedValue(undefined) };
    const mockEvent = { publish: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponService,
        CouponValidationService,
        { provide: CouponRepository, useValue: mockRepo },
        { provide: CouponUsageRepository, useValue: mockUsageRepo },
        { provide: AuditService, useValue: mockAudit },
        { provide: CacheService, useValue: mockCache },
        { provide: EventBusService, useValue: mockEvent },
      ],
    }).compile();

    service = module.get<CouponService>(CouponService);
    couponRepo = module.get(CouponRepository);
    couponUsageRepo = module.get(CouponUsageRepository);
    auditService = module.get(AuditService);
    cacheService = module.get(CacheService);
    eventBus = module.get(EventBusService);
  });

  it('should create coupon, invalidate cache, log audit, and publish event', async () => {
    const res = await service.createCoupon({
      salonId: 'sal-1',
      code: 'festive25',
      name: 'Festive 25% Off',
      discountType: CouponDiscountType.PERCENTAGE,
      discountValue: 25,
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-30'),
    });

    expect(res).toBeInstanceOf(CouponEntity);
    expect(res.code).toBe('FESTIVE25');
    expect(couponRepo.create).toHaveBeenCalled();
    expect(cacheService.delete).toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalled();
    expect(eventBus.publish).toHaveBeenCalled();
  });

  it('should reject coupon creation when code already exists', async () => {
    couponRepo.checkCodeExists.mockResolvedValueOnce(true);

    await expect(
      service.createCoupon({
        salonId: 'sal-1',
        code: 'FESTIVE25',
        name: 'Festive 25% Off',
        discountType: CouponDiscountType.PERCENTAGE,
        discountValue: 25,
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-30'),
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should reject when startDate >= endDate', async () => {
    await expect(
      service.createCoupon({
        salonId: 'sal-1',
        code: 'BAD_DATES',
        name: 'Bad Dates',
        discountType: CouponDiscountType.PERCENTAGE,
        discountValue: 25,
        startDate: new Date('2026-06-30'),
        endDate: new Date('2026-06-01'),
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should activate coupon and publish event', async () => {
    const res = await service.activateCoupon('cpn-1', 'sal-1', 1);
    expect(res.status).toBe(CouponStatus.ACTIVE);
    expect(couponRepo.updateStatus).toHaveBeenCalledWith('cpn-1', CouponStatus.ACTIVE, 1);
    expect(eventBus.publish).toHaveBeenCalled();
  });

  it('should pause coupon and publish event', async () => {
    couponRepo.updateStatus.mockResolvedValueOnce({ ...mockCoupon, status: CouponStatus.PAUSED });
    const res = await service.pauseCoupon('cpn-1', 'sal-1', 1);
    expect(res.status).toBe(CouponStatus.PAUSED);
    expect(eventBus.publish).toHaveBeenCalled();
  });

  it('should archive coupon and publish event', async () => {
    const res = await service.archiveCoupon('cpn-1', 'sal-1');
    expect(res.status).toBe(CouponStatus.ARCHIVED);
    expect(couponRepo.softDelete).toHaveBeenCalledWith('cpn-1', 'sal-1');
    expect(eventBus.publish).toHaveBeenCalled();
  });

  it('should validate coupon for checkout successfully', async () => {
    const res = await service.validateCouponForCheckout('FESTIVE25', {
      salonId: 'sal-1',
      branchId: 'br-1',
      customerId: 'cust-1',
      cartItems: [{ serviceId: 'srv-1', price: 2000 }],
      checkDate: new Date('2026-06-15'),
    });

    expect(res.isValid).toBe(true);
    expect(res.discountAmount).toBe(500); // 25% of 2000 = 500
  });
});
