import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CouponStatus, CouponUsageStatus, Prisma } from '@prisma/client';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { CouponUsageEntity } from '../entities/coupon-usage.entity';
import { CouponUsageRepository } from '../repositories/coupon-usage.repository';
import { CouponRepository } from '../repositories/coupon.repository';
import { CouponUsageService } from '../services/coupon-usage.service';

describe('CouponUsageService', () => {
  let service: CouponUsageService;
  let usageRepo: jest.Mocked<CouponUsageRepository>;
  let couponRepo: jest.Mocked<CouponRepository>;
  let transactionService: jest.Mocked<TransactionService>;
  let auditService: jest.Mocked<AuditService>;
  let eventBus: jest.Mocked<EventBusService>;

  const mockCoupon: any = {
    id: 'cpn-1',
    salonId: 'sal-1',
    code: 'SAVE100',
    totalUsageLimit: 50,
    perCustomerLimit: 1,
    currentUsageCount: 10,
    status: CouponStatus.ACTIVE,
    version: 1,
    deletedAt: null,
  };

  const mockUsage = {
    id: 'usg-1',
    couponId: 'cpn-1',
    salonId: 'sal-1',
    branchId: 'br-1',
    customerId: 'cust-1',
    bookingId: 'bk-1',
    appointmentId: null,
    invoiceId: null,
    discountAmount: 100,
    bookingTotalBeforeDiscount: 1000,
    bookingTotalAfterDiscount: 900,
    status: CouponUsageStatus.APPLIED,
    appliedAt: new Date(),
    settledAt: null,
    reversedAt: null,
    reversalReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockCouponRepo = {
      findById: jest.fn().mockResolvedValue(mockCoupon),
      incrementUsage: jest.fn().mockResolvedValue({ ...mockCoupon, currentUsageCount: 11 }),
      decrementUsage: jest.fn().mockResolvedValue({ ...mockCoupon, currentUsageCount: 10 }),
    };

    const mockUsageRepo = {
      countCustomerUsage: jest.fn().mockResolvedValue(0),
      findByBooking: jest.fn().mockResolvedValue(null),
      findById: jest.fn().mockResolvedValue(mockUsage),
      create: jest.fn().mockResolvedValue(mockUsage),
      update: jest.fn().mockResolvedValue(mockUsage),
      settle: jest.fn().mockResolvedValue({ ...mockUsage, status: CouponUsageStatus.SETTLED }),
      reverse: jest.fn().mockResolvedValue({ ...mockUsage, status: CouponUsageStatus.REVERSED }),
      expire: jest.fn().mockResolvedValue({ ...mockUsage, status: CouponUsageStatus.EXPIRED }),
      search: jest.fn().mockResolvedValue({ data: [mockUsage], total: 1 }),
      aggregateUsage: jest.fn().mockResolvedValue({ totalUsages: 1, totalDiscountGiven: 100 }),
    };

    const mockTx = {
      run: jest.fn().mockImplementation((cb) => cb()),
    };

    const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };
    const mockCache = { delete: jest.fn().mockResolvedValue(undefined) };
    const mockEvent = { publish: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponUsageService,
        { provide: CouponRepository, useValue: mockCouponRepo },
        { provide: CouponUsageRepository, useValue: mockUsageRepo },
        { provide: TransactionService, useValue: mockTx },
        { provide: AuditService, useValue: mockAudit },
        { provide: CacheService, useValue: mockCache },
        { provide: EventBusService, useValue: mockEvent },
      ],
    }).compile();

    service = module.get(CouponUsageService);
    couponRepo = module.get(CouponRepository);
    usageRepo = module.get(CouponUsageRepository);
    transactionService = module.get(TransactionService);
    auditService = module.get(AuditService);
    eventBus = module.get(EventBusService);
  });

  it('should apply coupon transactionally, increment usage, log audit, and publish event', async () => {
    const res = await service.applyCoupon({
      couponId: 'cpn-1',
      salonId: 'sal-1',
      branchId: 'br-1',
      customerId: 'cust-1',
      bookingId: 'bk-1',
      discountAmount: 100,
      bookingTotalBeforeDiscount: 1000,
      bookingTotalAfterDiscount: 900,
    });

    expect(res).toBeInstanceOf(CouponUsageEntity);
    expect(res.status).toBe(CouponUsageStatus.APPLIED);
    expect(couponRepo.incrementUsage).toHaveBeenCalledWith('cpn-1', 1, 1, undefined);
    expect(usageRepo.create).toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalled();
    expect(eventBus.publish).toHaveBeenCalled();
  });

  it('should reject when per-customer limit reached', async () => {
    usageRepo.countCustomerUsage.mockResolvedValueOnce(1); // Limit is 1

    await expect(
      service.applyCoupon({
        couponId: 'cpn-1',
        salonId: 'sal-1',
        branchId: 'br-1',
        customerId: 'cust-1',
        bookingId: 'bk-1',
        discountAmount: 100,
        bookingTotalBeforeDiscount: 1000,
        bookingTotalAfterDiscount: 900,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should settle coupon usage and emit event', async () => {
    const res = await service.settleCouponUsage('usg-1', 'inv-1');
    expect(res.status).toBe(CouponUsageStatus.SETTLED);
    expect(usageRepo.settle).toHaveBeenCalledWith('usg-1');
    expect(eventBus.publish).toHaveBeenCalled();
  });

  it('should reverse coupon usage and decrement usage count to restore quota', async () => {
    const res = await service.reverseCouponUsage('usg-1', 'Cancelled by salon');
    expect(res.status).toBe(CouponUsageStatus.REVERSED);
    expect(couponRepo.decrementUsage).toHaveBeenCalledWith('cpn-1', 1, undefined, undefined);
    expect(usageRepo.reverse).toHaveBeenCalledWith('usg-1', 'Cancelled by salon', undefined, undefined);
    expect(eventBus.publish).toHaveBeenCalled();
  });
});
