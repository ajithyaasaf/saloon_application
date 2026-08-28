import { Test, TestingModule } from '@nestjs/testing';
import { GiftCardTransactionType } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { GiftCardTransactionRepository } from '../repositories/gift-card.repository';

describe('GiftCardTransactionRepository (Dedicated)', () => {
  let txRepo: GiftCardTransactionRepository;
  let mockPrisma: any;

  const mockTx = {
    id: 'gctx-1',
    giftCardId: 'gc-1',
    bookingId: 'bk-1',
    invoiceId: 'inv-1',
    transactionType: GiftCardTransactionType.REDEMPTION,
    amount: 1500,
    balanceBefore: 5000,
    balanceAfter: 3500,
    notes: 'Service redemption',
    performedByUserId: 'user-1',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    mockPrisma = {
      giftCardTransaction: {
        findUnique: jest.fn().mockResolvedValue(mockTx),
        findMany: jest.fn().mockResolvedValue([mockTx]),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue(mockTx),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 1500 } }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GiftCardTransactionRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    txRepo = module.get(GiftCardTransactionRepository);
  });

  it('should find transaction by id', async () => {
    const res = await txRepo.findById('gctx-1');
    expect(res).toEqual(mockTx);
    expect(mockPrisma.giftCardTransaction.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'gctx-1' },
      }),
    );
  });

  it('should find transactions by gift card, booking, invoice, or user', async () => {
    const byCard = await txRepo.findByGiftCard('gc-1');
    expect(byCard).toHaveLength(1);

    const byBooking = await txRepo.findByBooking('bk-1');
    expect(byBooking).toHaveLength(1);

    const byInvoice = await txRepo.findByInvoice('inv-1');
    expect(byInvoice).toHaveLength(1);

    const byUser = await txRepo.findByUser('user-1');
    expect(byUser).toHaveLength(1);
  });

  it('should find by transaction type', async () => {
    const res = await txRepo.findByType(GiftCardTransactionType.REDEMPTION, 'gc-1');
    expect(res).toHaveLength(1);
  });

  it('should create immutable transaction entry', async () => {
    const res = await txRepo.create({
      giftCardId: 'gc-1',
      transactionType: GiftCardTransactionType.ISSUE,
      amount: 5000,
      balanceBefore: 0,
      balanceAfter: 5000,
    });
    expect(res).toBeDefined();
    expect(mockPrisma.giftCardTransaction.create).toHaveBeenCalled();
  });

  it('should calculate credits, debits, and ledger balance accurately', async () => {
    const credits = await txRepo.aggregateCredits('gc-1');
    expect(credits).toBe(1500);

    const debits = await txRepo.aggregateDebits('gc-1');
    expect(debits).toBe(1500);

    const ledgerBalance = await txRepo.getLedgerBalance('gc-1');
    expect(ledgerBalance).toBe(0);
  });
});
