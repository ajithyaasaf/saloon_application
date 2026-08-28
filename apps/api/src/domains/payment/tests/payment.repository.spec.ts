import { Test, TestingModule } from '@nestjs/testing';
import { PaymentMethod, PaymentProvider, PaymentStatus } from '@prisma/client';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PaymentRepository } from '../repositories/payment.repository';

describe('PaymentRepository', () => {
  let repository: PaymentRepository;
  let prisma: any;

  const mockPayment = {
    id: 'pay_123e4567-e89b-12d3-a456-426614174000',
    paymentCode: 'PAY-20260807-X9A2',
    bookingId: 'bk_123e4567-e89b-12d3-a456-426614174000',
    salonId: 'sal_123e4567-e89b-12d3-a456-426614174001',
    branchId: 'br_123e4567-e89b-12d3-a456-426614174002',
    customerId: 'usr_123e4567-e89b-12d3-a456-426614174003',
    status: PaymentStatus.UNPAID,
    paymentMethod: PaymentMethod.UPI,
    provider: PaymentProvider.CASHFREE,
    currency: 'INR',
    amountTotal: 177000,
    amountPaid: 0,
    amountRefunded: 0,
    amountDue: 177000,
    isPartialAllowed: false,
    idempotencyKey: 'idemp_key_123',
    version: 1,
    createdByUserId: 'usr_123e4567-e89b-12d3-a456-426614174003',
    updatedByUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    transactions: [],
    refunds: [],
    invoices: [],
  };

  beforeEach(async () => {
    prisma = {
      payment: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<PaymentRepository>(PaymentRepository);
  });

  describe('findById', () => {
    it('should return payment if exists and deletedAt is null', async () => {
      prisma.payment.findFirst.mockResolvedValue(mockPayment);
      const res = await repository.findById(mockPayment.id);
      expect(res).toEqual(mockPayment);
      expect(prisma.payment.findFirst).toHaveBeenCalledWith({
        where: { id: mockPayment.id, deletedAt: null },
        include: expect.any(Object),
      });
    });
  });

  describe('findByPaymentCode', () => {
    it('should return payment by payment code', async () => {
      prisma.payment.findFirst.mockResolvedValue(mockPayment);
      const res = await repository.findByPaymentCode(mockPayment.paymentCode);
      expect(res).toEqual(mockPayment);
    });
  });

  describe('findByIdempotencyKey', () => {
    it('should return payment by idempotency key', async () => {
      prisma.payment.findFirst.mockResolvedValue(mockPayment);
      const res = await repository.findByIdempotencyKey(mockPayment.idempotencyKey);
      expect(res).toEqual(mockPayment);
    });
  });

  describe('create', () => {
    it('should create a new payment', async () => {
      prisma.payment.create.mockResolvedValue(mockPayment);
      const res = await repository.create({
        paymentCode: mockPayment.paymentCode,
        bookingId: mockPayment.bookingId,
        salonId: mockPayment.salonId,
        branchId: mockPayment.branchId,
        customerId: mockPayment.customerId,
        status: PaymentStatus.UNPAID,
        paymentMethod: PaymentMethod.UPI,
        provider: PaymentProvider.CASHFREE,
        amountTotal: 177000,
        idempotencyKey: mockPayment.idempotencyKey,
        createdByUserId: mockPayment.createdByUserId,
      });
      expect(res).toEqual(mockPayment);
    });
  });

  describe('update', () => {
    it('should update payment when optimistic version matches', async () => {
      prisma.payment.updateMany.mockResolvedValue({ count: 1 });
      prisma.payment.findFirst.mockResolvedValue({ ...mockPayment, version: 2, status: PaymentStatus.PAID });

      const res = await repository.update(mockPayment.id, 1, { status: PaymentStatus.PAID });
      expect(res.status).toBe(PaymentStatus.PAID);
    });

    it('should throw ConflictException on version mismatch', async () => {
      prisma.payment.updateMany.mockResolvedValue({ count: 0 });
      prisma.payment.findUnique.mockResolvedValue({ ...mockPayment, version: 2 });

      await expect(repository.update(mockPayment.id, 1, { status: PaymentStatus.PAID })).rejects.toThrow(ConflictException);
    });
  });

  describe('softDelete', () => {
    it('should soft delete payment when optimistic version matches', async () => {
      prisma.payment.updateMany.mockResolvedValue({ count: 1 });
      prisma.payment.findUnique.mockResolvedValue({ ...mockPayment, deletedAt: new Date() });

      const res = await repository.softDelete(mockPayment.id, 1);
      expect(res.deletedAt).toBeDefined();
    });
  });
});
