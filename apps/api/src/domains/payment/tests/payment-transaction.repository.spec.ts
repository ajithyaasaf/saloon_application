import { Test, TestingModule } from '@nestjs/testing';
import { PaymentMethod, PaymentProvider, PaymentStatus } from '@prisma/client';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PaymentTransactionRepository } from '../repositories/payment-transaction.repository';

describe('PaymentTransactionRepository', () => {
  let repository: PaymentTransactionRepository;
  let prisma: any;

  const mockTransaction = {
    id: 'tx_123e4567-e89b-12d3-a456-426614174000',
    paymentId: 'pay_123e4567-e89b-12d3-a456-426614174000',
    providerTransactionId: 'cf_pay_99887766',
    gatewayReference: 'gateway_ref_123',
    authorizationReference: 'auth_ref_123',
    paymentMethod: PaymentMethod.UPI,
    provider: PaymentProvider.CASHFREE,
    amount: 177000,
    currency: 'INR',
    requestPayload: {},
    responsePayload: {},
    status: PaymentStatus.PAID,
    processedAt: new Date(),
    version: 1,
    createdByUserId: 'usr_123e4567-e89b-12d3-a456-426614174003',
    updatedByUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    prisma = {
      paymentTransaction: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentTransactionRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<PaymentTransactionRepository>(PaymentTransactionRepository);
  });

  describe('findByPayment', () => {
    it('should return transactions for payment', async () => {
      prisma.paymentTransaction.findMany.mockResolvedValue([mockTransaction]);
      const res = await repository.findByPayment(mockTransaction.paymentId);
      expect(res).toHaveLength(1);
    });
  });

  describe('findByProviderTransactionId', () => {
    it('should return transaction by provider transaction id', async () => {
      prisma.paymentTransaction.findFirst.mockResolvedValue(mockTransaction);
      const res = await repository.findByProviderTransactionId(mockTransaction.providerTransactionId);
      expect(res).toEqual(mockTransaction);
    });
  });

  describe('create', () => {
    it('should create transaction', async () => {
      prisma.paymentTransaction.create.mockResolvedValue(mockTransaction);
      const res = await repository.create({
        paymentId: mockTransaction.paymentId,
        providerTransactionId: mockTransaction.providerTransactionId,
        paymentMethod: PaymentMethod.UPI,
        provider: PaymentProvider.CASHFREE,
        amount: 177000,
        createdByUserId: mockTransaction.createdByUserId,
      });
      expect(res).toEqual(mockTransaction);
    });
  });

  describe('update', () => {
    it('should update transaction', async () => {
      prisma.paymentTransaction.updateMany.mockResolvedValue({ count: 1 });
      prisma.paymentTransaction.findFirst.mockResolvedValue({ ...mockTransaction, version: 2 });

      const res = await repository.update(mockTransaction.id, 1, { status: PaymentStatus.PAID });
      expect(res.version).toBe(2);
    });
  });
});
