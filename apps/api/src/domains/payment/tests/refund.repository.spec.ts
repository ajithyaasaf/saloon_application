import { Test, TestingModule } from '@nestjs/testing';
import { PaymentProvider, RefundStatus } from '@prisma/client';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { RefundRepository } from '../repositories/refund.repository';

describe('RefundRepository', () => {
  let repository: RefundRepository;
  let prisma: any;

  const mockRefund = {
    id: 'rfd_123e4567-e89b-12d3-a456-426614174000',
    refundCode: 'RFD-20260807-B812',
    paymentId: 'pay_123e4567-e89b-12d3-a456-426614174000',
    bookingId: 'bk_123e4567-e89b-12d3-a456-426614174000',
    amount: 50000,
    currency: 'INR',
    reason: 'Customer requested partial refund',
    gatewayRefundId: 'cf_rfd_77665544',
    provider: PaymentProvider.CASHFREE,
    status: RefundStatus.PENDING,
    processedByUserId: 'usr_123e4567-e89b-12d3-a456-426614174003',
    processedAt: null,
    version: 1,
    createdByUserId: 'usr_123e4567-e89b-12d3-a456-426614174003',
    updatedByUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    prisma = {
      refund: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<RefundRepository>(RefundRepository);
  });

  describe('findById', () => {
    it('should return refund by id', async () => {
      prisma.refund.findFirst.mockResolvedValue(mockRefund);
      const res = await repository.findById(mockRefund.id);
      expect(res).toEqual(mockRefund);
    });
  });

  describe('findByRefundCode', () => {
    it('should return refund by refund code', async () => {
      prisma.refund.findFirst.mockResolvedValue(mockRefund);
      const res = await repository.findByRefundCode(mockRefund.refundCode);
      expect(res).toEqual(mockRefund);
    });
  });

  describe('create', () => {
    it('should create refund', async () => {
      prisma.refund.create.mockResolvedValue(mockRefund);
      const res = await repository.create({
        refundCode: mockRefund.refundCode,
        paymentId: mockRefund.paymentId,
        bookingId: mockRefund.bookingId,
        amount: mockRefund.amount,
        provider: PaymentProvider.CASHFREE,
        processedByUserId: mockRefund.processedByUserId,
        createdByUserId: mockRefund.createdByUserId,
      });
      expect(res).toEqual(mockRefund);
    });
  });

  describe('update', () => {
    it('should update refund status', async () => {
      prisma.refund.updateMany.mockResolvedValue({ count: 1 });
      prisma.refund.findFirst.mockResolvedValue({ ...mockRefund, status: RefundStatus.SUCCESS, version: 2 });

      const res = await repository.update(mockRefund.id, 1, { status: RefundStatus.SUCCESS });
      expect(res.status).toBe(RefundStatus.SUCCESS);
    });
  });
});
