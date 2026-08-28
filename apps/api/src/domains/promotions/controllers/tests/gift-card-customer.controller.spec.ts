import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GiftCardStatus, GiftCardTransactionType } from '@prisma/client';
import { GiftCardEntity, GiftCardTransactionEntity } from '../../entities/gift-card.entity';
import { GiftCardTransactionService } from '../../services/gift-card-transaction.service';
import { GiftCardService } from '../../services/gift-card.service';
import { GiftCardCustomerController } from '../gift-card-customer.controller';

describe('GiftCardCustomerController', () => {
  let controller: GiftCardCustomerController;
  let giftCardService: jest.Mocked<GiftCardService>;
  let txService: jest.Mocked<GiftCardTransactionService>;

  const mockCustomer = { id: 'cust-1', email: 'cust@example.com', roles: ['CUSTOMER'] };

  const mockCard = new GiftCardEntity({
    id: 'gc-1',
    giftCardCode: 'GC-ABCD-1234-EF56',
    salonId: 'sal-1',
    purchasedByUserId: 'cust-1',
    recipientEmail: 'cust@example.com',
    initialBalance: 5000,
    currentBalance: 5000,
    currency: 'INR',
    status: GiftCardStatus.ACTIVE,
    expiresAt: new Date(Date.now() + 86400000 * 30),
    version: 1,
    createdAt: new Date(),
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
      redeemGiftCard: jest.fn().mockResolvedValue({
        giftCard: mockCard,
        amountRedeemed: 2000,
        remainingBalance: 3000,
      }),
    };

    const mockTxService = {
      getTransactionsByGiftCard: jest.fn().mockResolvedValue([mockTx]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GiftCardCustomerController],
      providers: [
        { provide: GiftCardService, useValue: mockCardService },
        { provide: GiftCardTransactionService, useValue: mockTxService },
      ],
    }).compile();

    controller = module.get<GiftCardCustomerController>(GiftCardCustomerController);
    giftCardService = module.get(GiftCardService);
    txService = module.get(GiftCardTransactionService);
  });

  it('should purchase gift card and mask bearer token in customer output', async () => {
    const res = await controller.purchaseGiftCard(mockCustomer, {
      salonId: 'sal-1',
      initialBalance: 5000,
      expiresAt: new Date(Date.now() + 86400000 * 30),
    });

    expect(res.data.id).toBe('gc-1');
    expect(res.data.maskedCode).toBe('GC-AB****EF56');
    expect(res.data).not.toHaveProperty('giftCardCode'); // Secret code not in standard response
    expect(giftCardService.issueGiftCard).toHaveBeenCalledWith(
      expect.objectContaining({ purchasedByUserId: 'cust-1' }),
      'cust-1',
    );
  });

  it('should get gift card balance for owned gift card', async () => {
    const res = await controller.getGiftCardBalance(mockCustomer, 'gc-1');
    expect(res.data.currentBalance).toBe(5000);
    expect(res.data.isRedeemable).toBe(true);
  });

  it('should reject access if customer is neither purchaser nor recipient', async () => {
    const unownedCard = new GiftCardEntity({
      id: 'gc-other',
      giftCardCode: 'GC-OTHER',
      salonId: 'sal-1',
      purchasedByUserId: 'other-user',
      recipientEmail: 'other@example.com',
      initialBalance: 1000,
      currentBalance: 1000,
      expiresAt: new Date(),
    });

    giftCardService.getGiftCardById.mockResolvedValueOnce(unownedCard);

    await expect(
      controller.getGiftCardById(mockCustomer, 'gc-other'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should redeem gift card with code', async () => {
    const res = await controller.redeemGiftCard(mockCustomer, {
      giftCardCode: 'GC-ABCD-1234-EF56',
      salonId: 'sal-1',
      amount: 2000,
    });

    expect(res.data.amountRedeemed).toBe(2000);
    expect(res.data.remainingBalance).toBe(3000);
    expect(giftCardService.redeemGiftCard).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 2000 }),
      'cust-1',
    );
  });
});
