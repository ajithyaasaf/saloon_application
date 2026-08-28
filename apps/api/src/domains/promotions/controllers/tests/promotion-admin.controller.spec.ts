import { Test, TestingModule } from '@nestjs/testing';
import { CouponDiscountType, CouponStatus, CouponUsageStatus, FlashSaleStatus, GiftCardStatus, GiftCardTransactionType, MarketingCampaignStatus, MarketingCampaignType } from '@prisma/client';
import { CouponUsageEntity } from '../../entities/coupon-usage.entity';
import { CouponEntity } from '../../entities/coupon.entity';
import { FlashSaleEntity } from '../../entities/flash-sale.entity';
import { GiftCardEntity, GiftCardTransactionEntity } from '../../entities/gift-card.entity';
import { MarketingCampaignEntity } from '../../entities/marketing-campaign.entity';
import { CouponUsageService } from '../../services/coupon-usage.service';
import { CouponService } from '../../services/coupon.service';
import { FlashSaleService } from '../../services/flash-sale.service';
import { GiftCardTransactionService } from '../../services/gift-card-transaction.service';
import { GiftCardService } from '../../services/gift-card.service';
import { MarketingCampaignService } from '../../services/marketing-campaign.service';
import { PromotionAdminController } from '../promotion-admin.controller';

describe('PromotionAdminController', () => {
  let controller: PromotionAdminController;

  const mockCoupon = new CouponEntity({
    id: 'cpn-1',
    code: 'ADMIN20',
    name: 'Admin Coupon',
    discountType: CouponDiscountType.PERCENTAGE,
    discountValue: 20,
    minBookingAmount: 100,
    minServicesCount: 1,
    isAutoApply: false,
    isHappyHour: false,
    validDaysOfWeek: [],
    startDate: new Date(),
    endDate: new Date(),
    status: CouponStatus.ACTIVE,
  });

  const mockUsage = new CouponUsageEntity({
    id: 'usg-1',
    couponId: 'cpn-1',
    salonId: 'sal-1',
    branchId: 'br-1',
    customerId: 'cust-1',
    discountAmount: 200,
    bookingTotalBeforeDiscount: 1000,
    bookingTotalAfterDiscount: 800,
    status: CouponUsageStatus.APPLIED,
    appliedAt: new Date(),
    createdAt: new Date(),
  });

  const mockGiftCard = new GiftCardEntity({
    id: 'gc-1',
    giftCardCode: 'GC-ADMIN-1234',
    salonId: 'sal-1',
    initialBalance: 5000,
    currentBalance: 5000,
    currency: 'INR',
    status: GiftCardStatus.ACTIVE,
    expiresAt: new Date(),
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

  const mockFlashSale = new FlashSaleEntity({
    id: 'fs-1',
    salonId: 'sal-1',
    branchId: 'br-1',
    serviceId: 'srv-1',
    title: 'Admin Flash Sale',
    discountPercentage: 50,
    specialPrice: 500,
    startTime: new Date(),
    endTime: new Date(),
    maxSlotQuota: 10,
    bookedSlotCount: 0,
    status: FlashSaleStatus.ACTIVE,
  });

  const mockCampaign = new MarketingCampaignEntity({
    id: 'cmp-1',
    campaignCode: 'ADMIN_CAMP',
    salonId: 'sal-1',
    name: 'Admin Campaign',
    campaignType: MarketingCampaignType.SEASONAL,
    channels: ['SMS'],
    status: MarketingCampaignStatus.RUNNING,
    createdAt: new Date(),
  });

  beforeEach(async () => {
    const mockCouponService = { searchCoupons: jest.fn().mockResolvedValue({ data: [mockCoupon], total: 1 }) };
    const mockUsageService = { searchUsages: jest.fn().mockResolvedValue({ data: [mockUsage], total: 1 }) };
    const mockGiftCardService = { searchGiftCards: jest.fn().mockResolvedValue({ data: [mockGiftCard], total: 1 }) };
    const mockTxService = { searchTransactions: jest.fn().mockResolvedValue({ data: [mockTx], total: 1 }) };
    const mockFlashSaleService = { searchFlashSales: jest.fn().mockResolvedValue({ data: [mockFlashSale], total: 1 }) };
    const mockCampaignService = { searchCampaigns: jest.fn().mockResolvedValue({ data: [mockCampaign], total: 1 }) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PromotionAdminController],
      providers: [
        { provide: CouponService, useValue: mockCouponService },
        { provide: CouponUsageService, useValue: mockUsageService },
        { provide: GiftCardService, useValue: mockGiftCardService },
        { provide: GiftCardTransactionService, useValue: mockTxService },
        { provide: FlashSaleService, useValue: mockFlashSaleService },
        { provide: MarketingCampaignService, useValue: mockCampaignService },
      ],
    }).compile();

    controller = module.get<PromotionAdminController>(PromotionAdminController);
  });

  it('should search coupons across platform', async () => {
    const res = await controller.searchCoupons({ page: 1, limit: 10 });
    expect(res.data).toHaveLength(1);
    expect(res.data[0].code).toBe('ADMIN20');
  });

  it('should search coupon usages across platform', async () => {
    const res = await controller.searchUsages({ page: 1, limit: 10 });
    expect(res.data).toHaveLength(1);
    expect(res.data[0].discountAmount).toBe(200);
  });

  it('should search gift cards and transactions across platform', async () => {
    const cards = await controller.searchGiftCards({ page: 1, limit: 10 });
    expect(cards.data).toHaveLength(1);

    const txs = await controller.searchGiftCardTransactions({ page: 1, limit: 10 });
    expect(txs.data).toHaveLength(1);
  });

  it('should search flash sales and campaigns across platform', async () => {
    const sales = await controller.searchFlashSales({ page: 1, limit: 10 });
    expect(sales.data).toHaveLength(1);

    const camps = await controller.searchCampaigns({ page: 1, limit: 10 });
    expect(camps.data).toHaveLength(1);
  });
});
