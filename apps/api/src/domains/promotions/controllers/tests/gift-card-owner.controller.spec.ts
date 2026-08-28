import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GiftCardStatus, GiftCardTransactionType } from '@prisma/client';
import { GiftCardEntity, GiftCardTransactionEntity } from '../../entities/gift-card.entity';
import { GiftCardTransactionService } from '../../services/gift-card-transaction.service';
import { GiftCardService } from '../../services/gift-card.service';
import { GiftCardOwnerController } from '../gift-card-owner.controller';

describe('GiftCardOwnerController', () => {
  let controller: GiftCardOwnerController;
  let giftCardService: jest.Mocked<GiftCardService>;
  let txService: jest.Mocked<GiftCardTransactionService>;

  const mockOwnerUser = { id: 'owner-1', salonId: 'sal-1', roles: ['SALON_OWNER'] };

  const mockCard = new GiftCardEntity({
    id: 'gc-1',
    giftCardCode: 'GC-ABCD-1234-EF56',
    salonId: 'sal-1',
    initialBalance: 5000,
    currentBalance: 5000,
    currency: 'INR',
    status: GiftCardStatus.ACTIVE,
    expiresAt: new Date(Date.now() + 86400000 * 30),
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mockTx = new GiftCardTransactionEntity({
    id: 'tx-1',
    giftCardId: 'gc-1',
    transactionType: GiftCardTransactionType.ISSUE,
    amount: 5000,
    balanceBefore: 0,
    balanceAfter: 5000,
    createdAt: new Date(),
  });

  beforeEach(async () => {
    const mockCardService = {
      issueGiftCard: jest.fn().mockResolvedValue(mockCard),
      searchGiftCards: jest.fn().mockResolvedValue({ data: [mockCard], total: 1 }),
      getGiftCardById: jest.fn().mockResolvedValue(mockCard),
      freezeGiftCard: jest.fn().mockResolvedValue(new GiftCardEntity({ ...mockCard, status: GiftCardStatus.FROZEN })),
      cancelGiftCard: jest.fn().mockResolvedValue(new GiftCardEntity({ ...mockCard, status: GiftCardStatus.CANCELLED })),
      refundCredit: jest.fn().mockResolvedValue(new GiftCardEntity({ ...mockCard, currentBalance: 5000 })),
    };

    const mockTxService = {
      getTransactionsByGiftCard: jest.fn().mockResolvedValue([mockTx]),
      getLedgerBalance: jest.fn().mockResolvedValue(5000),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GiftCardOwnerController],
      providers: [
        { provide: GiftCardService, useValue: mockCardService },
        { provide: GiftCardTransactionService, useValue: mockTxService },
      ],
    }).compile();

    controller = module.get<GiftCardOwnerController>(GiftCardOwnerController);
    giftCardService = module.get(GiftCardService);
    txService = module.get(GiftCardTransactionService);
  });

  it('should issue gift card and return full operational code to owner', async () => {
    const res = await controller.issueGiftCard(mockOwnerUser, {
      initialBalance: 5000,
      expiresAt: new Date(Date.now() + 86400000 * 30),
    });

    expect(res.data.id).toBe('gc-1');
    expect(res.data.giftCardCode).toBe('GC-ABCD-1234-EF56');
    expect(giftCardService.issueGiftCard).toHaveBeenCalledWith(
      expect.objectContaining({ salonId: 'sal-1' }),
      'owner-1',
    );
  });

  it('should get gift card balance and ledger reconciliation', async () => {
    const res = await controller.getGiftCardBalance(mockOwnerUser, 'gc-1');
    expect(res.data.currentBalance).toBe(5000);
    expect(res.data.ledgerReconciliation.isReconciled).toBe(true);
    expect(txService.getLedgerBalance).toHaveBeenCalledWith('gc-1');
  });

  it('should freeze and cancel gift card', async () => {
    const freeze = await controller.freezeGiftCard(mockOwnerUser, 'gc-1', 1);
    expect(freeze.data.status).toBe(GiftCardStatus.FROZEN);

    const cancel = await controller.cancelGiftCard(mockOwnerUser, 'gc-1', { reason: 'Lost' });
    expect(cancel.data.status).toBe(GiftCardStatus.CANCELLED);
  });

  it('should process refund credit onto gift card', async () => {
    const res = await controller.refundCredit(mockOwnerUser, 'gc-1', {
      amount: 1000,
      notes: 'Customer refund',
    });

    expect(res.data.currentBalance).toBe(5000);
    expect(giftCardService.refundCredit).toHaveBeenCalledWith(
      expect.objectContaining({
        giftCardId: 'gc-1',
        salonId: 'sal-1',
        amount: 1000,
      }),
      'owner-1',
    );
  });
});
