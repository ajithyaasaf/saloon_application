import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { AuditModule } from '../../shared/audit/audit.module';
import { SharedCacheModule } from '../../shared/cache/cache.module';
import { EventsModule } from '../../shared/events/events.module';
import { SharedNotificationModule } from '../../shared/notification/notification.module';
import { SharedQueueModule } from '../../shared/queue/queue.module';
import { TransactionModule } from '../../shared/transaction/transaction.module';

import { CustomerConsentHistoryRepository } from './repositories/customer-consent-history.repository';
import { CustomerLoyaltyRepository } from './repositories/customer-loyalty.repository';
import { CustomerMembershipRepository } from './repositories/customer-membership.repository';
import { CustomerMergeHistoryRepository } from './repositories/customer-merge-history.repository';
import { CustomerNoteRepository } from './repositories/customer-note.repository';
import { CustomerPreferenceRepository } from './repositories/customer-preference.repository';
import { CustomerProfileRepository } from './repositories/customer-profile.repository';
import { CustomerReferralRepository } from './repositories/customer-referral.repository';
import { CustomerTagAssignmentRepository } from './repositories/customer-tag-assignment.repository';
import { CustomerTagRepository } from './repositories/customer-tag.repository';
import { CustomerVisitHistoryRepository } from './repositories/customer-visit-history.repository';
import { CustomerWalletLedgerRepository } from './repositories/customer-wallet-ledger.repository';
import { LoyaltyLedgerRepository } from './repositories/loyalty-ledger.repository';
import { MembershipPlanRepository } from './repositories/membership-plan.repository';
import { ReferralRewardRepository } from './repositories/referral-reward.repository';

import { CustomerLoyaltyService } from './services/customer-loyalty.service';
import { CustomerMergeService } from './services/customer-merge.service';
import { CustomerPreferenceService } from './services/customer-preference.service';
import { CustomerTagService } from './services/customer-tag.service';
import { CustomerVisitService } from './services/customer-visit.service';
import { CustomerWalletService } from './services/customer-wallet.service';
import { CustomerService } from './services/customer.service';
import { MembershipService } from './services/membership.service';
import { ReferralService } from './services/referral.service';

import { CustomerAdminController } from './controllers/customer-admin.controller';
import { CustomerCustomerController } from './controllers/customer-customer.controller';
import { CustomerOwnerController } from './controllers/customer-owner.controller';
import { CustomerPublicController } from './controllers/customer-public.controller';

const REPOSITORIES = [
  CustomerProfileRepository,
  CustomerPreferenceRepository,
  CustomerConsentHistoryRepository,
  CustomerNoteRepository,
  CustomerTagRepository,
  CustomerTagAssignmentRepository,
  CustomerLoyaltyRepository,
  LoyaltyLedgerRepository,
  MembershipPlanRepository,
  CustomerMembershipRepository,
  CustomerWalletLedgerRepository,
  CustomerReferralRepository,
  ReferralRewardRepository,
  CustomerVisitHistoryRepository,
  CustomerMergeHistoryRepository,
];

const SERVICES = [
  CustomerService,
  CustomerPreferenceService,
  CustomerTagService,
  CustomerLoyaltyService,
  MembershipService,
  CustomerWalletService,
  ReferralService,
  CustomerVisitService,
  CustomerMergeService,
];

const CONTROLLERS = [
  CustomerPublicController,
  CustomerCustomerController,
  CustomerOwnerController,
  CustomerAdminController,
];

@Module({
  imports: [
    DatabaseModule,
    TransactionModule,
    AuditModule,
    SharedCacheModule,
    EventsModule,
    SharedNotificationModule,
    SharedQueueModule,
  ],
  controllers: [...CONTROLLERS],
  providers: [...REPOSITORIES, ...SERVICES],
  exports: [...REPOSITORIES, ...SERVICES],
})
export class CustomerModule {}
