import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { AuditModule } from '../../shared/audit/audit.module';
import { SharedCacheModule } from '../../shared/cache/cache.module';
import { EventsModule } from '../../shared/events/events.module';
import { TransactionModule } from '../../shared/transaction/transaction.module';

import { CouponCustomerController } from './controllers/coupon-customer.controller';
import { CouponOwnerController } from './controllers/coupon-owner.controller';
import { CouponPublicController } from './controllers/coupon-public.controller';
import { FlashSaleOwnerController } from './controllers/flash-sale-owner.controller';
import { FlashSalePublicController } from './controllers/flash-sale-public.controller';
import { GiftCardCustomerController } from './controllers/gift-card-customer.controller';
import { GiftCardOwnerController } from './controllers/gift-card-owner.controller';
import { MarketingCampaignOwnerController } from './controllers/marketing-campaign-owner.controller';
import { PromotionAdminController } from './controllers/promotion-admin.controller';

import {
  CouponBranchApplicabilityRepository,
  CouponCategoryApplicabilityRepository,
  CouponCustomerEligibilityRepository,
  CouponRepository,
  CouponServiceApplicabilityRepository,
} from './repositories/coupon.repository';
import { CouponUsageRepository } from './repositories/coupon-usage.repository';
import { FlashSaleRepository } from './repositories/flash-sale.repository';
import {
  GiftCardRepository,
  GiftCardTransactionRepository,
} from './repositories/gift-card.repository';
import { MarketingCampaignRepository } from './repositories/marketing-campaign.repository';

import { CouponApplicabilityService } from './services/coupon-applicability.service';
import { CouponUsageService } from './services/coupon-usage.service';
import { CouponValidationService } from './services/coupon-validation.service';
import { CouponService } from './services/coupon.service';
import { FlashSaleService } from './services/flash-sale.service';
import { GiftCardTransactionService } from './services/gift-card-transaction.service';
import { GiftCardService } from './services/gift-card.service';
import { MarketingCampaignService } from './services/marketing-campaign.service';

const CONTROLLERS = [
  CouponPublicController,
  CouponCustomerController,
  CouponOwnerController,
  GiftCardCustomerController,
  GiftCardOwnerController,
  FlashSalePublicController,
  FlashSaleOwnerController,
  MarketingCampaignOwnerController,
  PromotionAdminController,
];

const REPOSITORIES = [
  CouponRepository,
  CouponServiceApplicabilityRepository,
  CouponCategoryApplicabilityRepository,
  CouponBranchApplicabilityRepository,
  CouponCustomerEligibilityRepository,
  CouponUsageRepository,
  GiftCardRepository,
  GiftCardTransactionRepository,
  FlashSaleRepository,
  MarketingCampaignRepository,
];

const SERVICES = [
  CouponValidationService,
  CouponService,
  CouponApplicabilityService,
  CouponUsageService,
  GiftCardTransactionService,
  GiftCardService,
  FlashSaleService,
  MarketingCampaignService,
];

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    SharedCacheModule,
    EventsModule,
    TransactionModule,
  ],
  controllers: CONTROLLERS,
  providers: [...REPOSITORIES, ...SERVICES],
  exports: [...REPOSITORIES, ...SERVICES],
})
export class PromotionsModule {}
