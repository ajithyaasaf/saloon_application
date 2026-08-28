import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GiftCardStatus, GiftCardTransactionType } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  GiftCardRepository,
  GiftCardTransactionRepository,
} from '../repositories/gift-card.repository';

describe('GiftCardRepository & GiftCardTransactionRepository', () => {
  let cardRepo: GiftCardRepository;
  let txRepo: GiftCardTransactionRepository;
  let mockPrisma: any;

  const mockCard = {
    id: 'gc-1',
    giftCardCode: 'GIFT-1234-5678-90AB',
    salonId: 'sal-1',
    purchasedByUserId: 'user-1',
    recipientName: 'Jane Doe',
    recipientEmail: 'jane@example.com',
    recipientPhone: '+919876543210',
    personalMessage: 'Happy Birthday!',
    initialBalance: 5000,
    currentBalance: 5000,
    currency: 'INR',
    status: GiftCardStatus.ACTIVE,
    expiresAt: new Date('2027-01-01'),
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockTx = {
    id: 'gct-1',
    giftCardId: 'gc-1',
    bookingId: 'bk-1',
    invoiceId: null,
    transactionType: GiftCardTransactionType.REDEMPTION,
    amount: 1500,
    balanceBefore: 5000,
    balanceAfter: 3500,
    notes: 'Booking redemption',
    performedByUserId: 'staff-1',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    mockPrisma = {
      giftCard: {
        findFirst: jest.fn().mockResolvedValue(mockCard),
        findUnique: jest.fn().mockResolvedValue(mockCard),
        findMany: jest.fn().mockResolvedValue([mockCard]),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue(mockCard),
        update: jest.fn().mockResolvedValue({ ...mockCard, version: 2 }),
      },
      giftCardTransaction: {
        findUnique: jest.fn().mockResolvedValue(mockTx),
        findMany: jest.fn().mockResolvedValue([mockTx]),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue(mockTx),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        aggregate: jest.fn().mockImplementation(({ where }) => {
          if (where.transactionType.in.includes(GiftCardTransactionType.ISSUE)) {
            return Promise.resolve({ _sum: { amount: 5000 } });
          }
          return Promise.resolve({ _sum: { amount: 1500 } });
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GiftCardRepository,
        GiftCardTransactionRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    cardRepo = module.get<GiftCardRepository>(GiftCardRepository);
    txRepo = module.get<GiftCardTransactionRepository>(GiftCardTransactionRepository);
  });

  describe('GiftCardRepository', () => {
    it('should find gift card by code with tenant isolation', async () => {
      const res = await cardRepo.findByCode('GIFT-1234-5678-90AB', 'sal-1');
      expect(res).toEqual(mockCard);
      expect(mockPrisma.giftCard.findFirst).toHaveBeenCalledWith({
        where: { giftCardCode: 'GIFT-1234-5678-90AB', salonId: 'sal-1', deletedAt: null },
        include: expect.any(Object),
      });
    });

    it('should find active gift card by code with balance check', async () => {
      const res = await cardRepo.findActiveByCode('GIFT-1234-5678-90AB', 'sal-1');
      expect(res).toEqual(mockCard);
    });

    it('should create a gift card', async () => {
      const res = await cardRepo.create({
        giftCardCode: 'GIFT-1234-5678-90AB',
        salonId: 'sal-1',
        initialBalance: 5000,
        currentBalance: 5000,
        expiresAt: new Date('2027-01-01'),
      });
      expect(res).toEqual(mockCard);
      expect(mockPrisma.giftCard.create).toHaveBeenCalled();
    });

    it('should debit gift card balance safely', async () => {
      await cardRepo.debitBalance('gc-1', 1500, 1);
      expect(mockPrisma.giftCard.update).toHaveBeenCalledWith({
        where: { id: 'gc-1', version: 1 },
        data: expect.objectContaining({
          currentBalance: 3500,
          status: GiftCardStatus.PARTIALLY_REDEEMED,
          version: { increment: 1 },
        }),
      });
    });

    it('should reject debit when balance is insufficient', async () => {
      mockPrisma.giftCard.findUnique.mockResolvedValueOnce({ ...mockCard, currentBalance: 500 });
      await expect(cardRepo.debitBalance('gc-1', 1000, 1)).rejects.toThrow(ConflictException);
    });

    it('should credit gift card balance on refund', async () => {
      mockPrisma.giftCard.findUnique.mockResolvedValueOnce({
        ...mockCard,
        currentBalance: 3500,
        initialBalance: 5000,
      });

      await cardRepo.creditBalance('gc-1', 1500, 1);
      expect(mockPrisma.giftCard.update).toHaveBeenCalledWith({
        where: { id: 'gc-1', version: 1 },
        data: expect.objectContaining({
          currentBalance: 5000,
          status: GiftCardStatus.ACTIVE,
          version: { increment: 1 },
        }),
      });
    });

    it('should freeze gift card', async () => {
      await cardRepo.freeze('gc-1', 1);
      expect(mockPrisma.giftCard.update).toHaveBeenCalledWith({
        where: { id: 'gc-1', version: 1 },
        data: expect.objectContaining({
          status: GiftCardStatus.FROZEN,
        }),
      });
    });

    it('should soft delete gift card', async () => {
      await cardRepo.softDelete('gc-1', 'sal-1');
      expect(mockPrisma.giftCard.update).toHaveBeenCalledWith({
        where: { id: 'gc-1' },
        data: expect.objectContaining({
          status: GiftCardStatus.CANCELLED,
          deletedAt: expect.any(Date),
        }),
      });
    });
  });

  describe('GiftCardTransactionRepository', () => {
    it('should create immutable transaction record', async () => {
      const res = await txRepo.create({
        giftCardId: 'gc-1',
        bookingId: 'bk-1',
        transactionType: GiftCardTransactionType.REDEMPTION,
        amount: 1500,
        balanceBefore: 5000,
        balanceAfter: 3500,
      });
      expect(res).toEqual(mockTx);
      expect(mockPrisma.giftCardTransaction.create).toHaveBeenCalled();
    });

    it('should aggregate ledger balance correctly', async () => {
      const balance = await txRepo.getLedgerBalance('gc-1');
      expect(balance).toBe(3500); // 5000 credits - 1500 debits
    });
  });
});
