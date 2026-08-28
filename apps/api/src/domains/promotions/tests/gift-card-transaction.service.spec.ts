import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GiftCardTransactionType } from '@prisma/client';
import { GiftCardTransactionEntity } from '../entities/gift-card.entity';
import {
  GiftCardRepository,
  GiftCardTransactionRepository,
} from '../repositories/gift-card.repository';
import { GiftCardTransactionService } from '../services/gift-card-transaction.service';

describe('GiftCardTransactionService', () => {
  let service: GiftCardTransactionService;
  let txRepo: jest.Mocked<GiftCardTransactionRepository>;
  let cardRepo: jest.Mocked<GiftCardRepository>;

  const mockTx = {
    id: 'tx-1',
    giftCardId: 'gc-1',
    bookingId: 'bk-1',
    invoiceId: null,
    transactionType: GiftCardTransactionType.REDEMPTION,
    amount: 1000,
    balanceBefore: 3000,
    balanceAfter: 2000,
    notes: 'Redemption',
    performedByUserId: 'user-1',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockTxRepo = {
      create: jest.fn().mockResolvedValue(mockTx),
      findByGiftCard: jest.fn().mockResolvedValue([mockTx]),
      findByBooking: jest.fn().mockResolvedValue([mockTx]),
      getLedgerBalance: jest.fn().mockResolvedValue(2000),
      search: jest.fn().mockResolvedValue({ data: [mockTx], total: 1 }),
    };

    const mockCardRepo = {
      findById: jest.fn().mockResolvedValue({ id: 'gc-1', salonId: 'sal-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GiftCardTransactionService,
        { provide: GiftCardTransactionRepository, useValue: mockTxRepo },
        { provide: GiftCardRepository, useValue: mockCardRepo },
      ],
    }).compile();

    service = module.get(GiftCardTransactionService);
    txRepo = module.get(GiftCardTransactionRepository);
    cardRepo = module.get(GiftCardRepository);
  });

  it('should record transaction for existing gift card', async () => {
    const res = await service.recordTransaction({
      giftCardId: 'gc-1',
      transactionType: GiftCardTransactionType.REDEMPTION,
      amount: 1000,
      balanceBefore: 3000,
      balanceAfter: 2000,
    });

    expect(res).toBeInstanceOf(GiftCardTransactionEntity);
    expect(res.amount).toBe(1000);
    expect(txRepo.create).toHaveBeenCalled();
  });

  it('should throw NotFoundException if gift card does not exist', async () => {
    cardRepo.findById.mockResolvedValueOnce(null);
    await expect(
      service.recordTransaction({
        giftCardId: 'unknown-gc',
        transactionType: GiftCardTransactionType.REDEMPTION,
        amount: 1000,
        balanceBefore: 3000,
        balanceAfter: 2000,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should get transactions by gift card', async () => {
    const res = await service.getTransactionsByGiftCard('gc-1');
    expect(res).toHaveLength(1);
    expect(txRepo.findByGiftCard).toHaveBeenCalledWith('gc-1');
  });

  it('should get ledger balance from repository', async () => {
    const balance = await service.getLedgerBalance('gc-1');
    expect(balance).toBe(2000);
  });
});
