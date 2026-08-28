import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GiftCardStatus, GiftCardTransactionType } from '@prisma/client';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { GiftCardEntity } from '../entities/gift-card.entity';
import {
  GiftCardRepository,
  GiftCardTransactionRepository,
} from '../repositories/gift-card.repository';
import { GiftCardService } from '../services/gift-card.service';

describe('GiftCardService', () => {
  let service: GiftCardService;
  let cardRepo: jest.Mocked<GiftCardRepository>;
  let txRepo: jest.Mocked<GiftCardTransactionRepository>;
  let transactionService: jest.Mocked<TransactionService>;
  let auditService: jest.Mocked<AuditService>;
  let eventBus: jest.Mocked<EventBusService>;

  const mockCard: any = {
    id: 'gc-1',
    giftCardCode: 'GC-ABCD-1234-EF56',
    salonId: 'sal-1',
    purchasedByUserId: 'user-1',
    recipientName: 'John Doe',
    recipientEmail: 'john@example.com',
    recipientPhone: '+919988776655',
    personalMessage: 'Enjoy!',
    initialBalance: 5000,
    currentBalance: 5000,
    currency: 'INR',
    status: GiftCardStatus.ACTIVE,
    expiresAt: new Date(Date.now() + 86400000 * 30),
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockTx: any = {
    id: 'tx-1',
    giftCardId: 'gc-1',
    bookingId: null,
    invoiceId: null,
    transactionType: GiftCardTransactionType.ISSUE,
    amount: 5000,
    balanceBefore: 0,
    balanceAfter: 5000,
    notes: 'Initial gift card issuance',
    performedByUserId: 'user-1',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockCardRepo = {
      create: jest.fn().mockResolvedValue(mockCard),
      findById: jest.fn().mockResolvedValue(mockCard),
      findByCode: jest.fn().mockResolvedValue(mockCard),
      debitBalance: jest.fn().mockResolvedValue({ ...mockCard, currentBalance: 3000, status: GiftCardStatus.PARTIALLY_REDEEMED }),
      creditBalance: jest.fn().mockResolvedValue({ ...mockCard, currentBalance: 5000, status: GiftCardStatus.ACTIVE }),
      freeze: jest.fn().mockResolvedValue({ ...mockCard, status: GiftCardStatus.FROZEN }),
      cancel: jest.fn().mockResolvedValue({ ...mockCard, status: GiftCardStatus.CANCELLED }),
      search: jest.fn().mockResolvedValue({ data: [mockCard], total: 1 }),
    };

    const mockTxRepo = {
      create: jest.fn().mockResolvedValue(mockTx),
    };

    const mockTransactionService = {
      run: jest.fn().mockImplementation((cb) => cb()),
    };

    const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };
    const mockCache = { delete: jest.fn().mockResolvedValue(undefined) };
    const mockEvent = { publish: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GiftCardService,
        { provide: GiftCardRepository, useValue: mockCardRepo },
        { provide: GiftCardTransactionRepository, useValue: mockTxRepo },
        { provide: TransactionService, useValue: mockTransactionService },
        { provide: AuditService, useValue: mockAudit },
        { provide: CacheService, useValue: mockCache },
        { provide: EventBusService, useValue: mockEvent },
      ],
    }).compile();

    service = module.get(GiftCardService);
    cardRepo = module.get(GiftCardRepository);
    txRepo = module.get(GiftCardTransactionRepository);
    transactionService = module.get(TransactionService);
    auditService = module.get(AuditService);
    eventBus = module.get(EventBusService);
  });

  it('should issue gift card with unique code and initial transaction ledger', async () => {
    const res = await service.issueGiftCard({
      salonId: 'sal-1',
      initialBalance: 5000,
      expiresAt: new Date(Date.now() + 86400000 * 30),
      recipientEmail: 'john@example.com',
    });

    expect(res).toBeInstanceOf(GiftCardEntity);
    expect(cardRepo.create).toHaveBeenCalled();
    expect(txRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionType: GiftCardTransactionType.ISSUE,
        amount: 5000,
      }),
      undefined,
    );
    expect(auditService.log).toHaveBeenCalled();
    expect(eventBus.publish).toHaveBeenCalled();
  });

  it('should redeem gift card transactionally with debit and ledger entry', async () => {
    const res = await service.redeemGiftCard({
      giftCardCode: 'GC-ABCD-1234-EF56',
      salonId: 'sal-1',
      amount: 2000,
      bookingId: 'bk-1',
    });

    expect(res.amountRedeemed).toBe(2000);
    expect(res.remainingBalance).toBe(3000);
    expect(cardRepo.debitBalance).toHaveBeenCalledWith('gc-1', 2000, 1, undefined);
    expect(txRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionType: GiftCardTransactionType.REDEMPTION,
        amount: 2000,
      }),
      undefined,
    );
    expect(eventBus.publish).toHaveBeenCalled();
  });

  it('should reject redemption if balance is insufficient', async () => {
    await expect(
      service.redeemGiftCard({
        giftCardCode: 'GC-ABCD-1234-EF56',
        salonId: 'sal-1',
        amount: 10000, // Available is 5000
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should refund credit gift card and emit event', async () => {
    cardRepo.findById.mockResolvedValueOnce({ ...mockCard, currentBalance: 3000 });

    const res = await service.refundCredit({
      giftCardId: 'gc-1',
      salonId: 'sal-1',
      amount: 2000,
      notes: 'Booking cancellation refund',
    });

    expect(res.currentBalance).toBe(5000);
    expect(cardRepo.creditBalance).toHaveBeenCalledWith('gc-1', 2000, 1, undefined);
    expect(txRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionType: GiftCardTransactionType.REFUND_CREDIT,
        amount: 2000,
      }),
      undefined,
    );
    expect(eventBus.publish).toHaveBeenCalled();
  });

  it('should freeze and cancel gift card', async () => {
    const frozen = await service.freezeGiftCard('gc-1', 'sal-1', 1);
    expect(frozen.status).toBe(GiftCardStatus.FROZEN);

    const cancelled = await service.cancelGiftCard('gc-1', 'sal-1', 'Lost card', 1);
    expect(cancelled.status).toBe(GiftCardStatus.CANCELLED);
  });
});
