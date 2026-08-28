import { Test, TestingModule } from '@nestjs/testing';
import { CouponUsageStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CouponUsageRepository } from '../repositories/coupon-usage.repository';

describe('CouponUsageRepository', () => {
  let usageRepo: CouponUsageRepository;
  let mockPrisma: any;

  const mockUsage = {
    id: 'usg-1',
    couponId: 'cpn-1',
    salonId: 'sal-1',
    branchId: 'br-1',
    customerId: 'cust-1',
    bookingId: 'bk-1',
    appointmentId: null,
    invoiceId: 'inv-1',
    discountAmount: 200,
    bookingTotalBeforeDiscount: 1000,
    bookingTotalAfterDiscount: 800,
    status: CouponUsageStatus.APPLIED,
    appliedAt: new Date(),
    settledAt: null,
    reversedAt: null,
    reversalReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockPrisma = {
      couponUsage: {
        findFirst: jest.fn().mockResolvedValue(mockUsage),
        findUnique: jest.fn().mockResolvedValue(mockUsage),
        findMany: jest.fn().mockResolvedValue([mockUsage]),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue(mockUsage),
        update: jest.fn().mockResolvedValue({ ...mockUsage, status: CouponUsageStatus.SETTLED }),
        aggregate: jest.fn().mockResolvedValue({ _sum: { discountAmount: 200 } }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponUsageRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    usageRepo = module.get<CouponUsageRepository>(CouponUsageRepository);
  });

  it('should find usage by id with salon isolation', async () => {
    const res = await usageRepo.findById('usg-1', 'sal-1');
    expect(res).toEqual(mockUsage);
    expect(mockPrisma.couponUsage.findFirst).toHaveBeenCalledWith({
      where: { id: 'usg-1', salonId: 'sal-1' },
      include: expect.any(Object),
    });
  });

  it('should find usage by booking', async () => {
    const res = await usageRepo.findByBooking('bk-1');
    expect(res).toEqual(mockUsage);
  });

  it('should find usage by invoice', async () => {
    const res = await usageRepo.findByInvoice('inv-1');
    expect(res).toEqual(mockUsage);
  });

  it('should count customer usage for a coupon', async () => {
    const count = await usageRepo.countCustomerUsage('cust-1', 'cpn-1');
    expect(count).toBe(1);
  });

  it('should count total coupon usage', async () => {
    const count = await usageRepo.countCouponUsage('cpn-1');
    expect(count).toBe(1);
  });

  it('should create coupon usage record', async () => {
    const res = await usageRepo.create({
      couponId: 'cpn-1',
      salonId: 'sal-1',
      branchId: 'br-1',
      customerId: 'cust-1',
      discountAmount: 200,
      bookingTotalBeforeDiscount: 1000,
      bookingTotalAfterDiscount: 800,
    });
    expect(res).toEqual(mockUsage);
    expect(mockPrisma.couponUsage.create).toHaveBeenCalled();
  });

  it('should settle coupon usage', async () => {
    await usageRepo.settle('usg-1');
    expect(mockPrisma.couponUsage.update).toHaveBeenCalledWith({
      where: { id: 'usg-1' },
      data: expect.objectContaining({
        status: CouponUsageStatus.SETTLED,
        settledAt: expect.any(Date),
      }),
    });
  });

  it('should reverse coupon usage with reason', async () => {
    await usageRepo.reverse('usg-1', 'Booking cancelled by customer');
    expect(mockPrisma.couponUsage.update).toHaveBeenCalledWith({
      where: { id: 'usg-1' },
      data: expect.objectContaining({
        status: CouponUsageStatus.REVERSED,
        reversalReason: 'Booking cancelled by customer',
        reversedAt: expect.any(Date),
      }),
    });
  });

  it('should expire coupon usage', async () => {
    await usageRepo.expire('usg-1');
    expect(mockPrisma.couponUsage.update).toHaveBeenCalledWith({
      where: { id: 'usg-1' },
      data: { status: CouponUsageStatus.EXPIRED },
    });
  });

  it('should aggregate usage metrics', async () => {
    const res = await usageRepo.aggregateUsage('cpn-1', 'sal-1');
    expect(res.totalUsages).toBe(1);
    expect(res.totalDiscountGiven).toBe(200);
  });
});
