import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { AuditModule } from '../../shared/audit/audit.module';
import { SharedCacheModule } from '../../shared/cache/cache.module';
import { EventsModule } from '../../shared/events/events.module';
import { TransactionModule } from '../../shared/transaction/transaction.module';

import { ReviewAdminController } from './controllers/review-admin.controller';
import { ReviewCustomerController } from './controllers/review-customer.controller';
import { ReviewOwnerController } from './controllers/review-owner.controller';
import { ReviewPublicController } from './controllers/review-public.controller';

import {
  BranchRatingSummaryRepository,
  SalonRatingSummaryRepository,
  ServiceRatingSummaryRepository,
  StaffRatingSummaryRepository,
} from './repositories/reputation-summary.repository';
import { ReviewInvitationRepository } from './repositories/review-invitation.repository';
import {
  ReviewDisputeRepository,
  ReviewFlagRepository,
} from './repositories/review-moderation.repository';
import {
  ReviewHelpfulVoteRepository,
  ReviewItemRatingRepository,
  ReviewMediaAttachmentRepository,
  ReviewReplyRepository,
  ReviewRepository,
} from './repositories/review.repository';

import {
  BranchRatingService,
  SalonRatingService,
  ServiceRatingService,
  StaffRatingService,
} from './services/reputation-summary.service';
import { ReviewDisputeService } from './services/review-dispute.service';
import { ReviewHelpfulVoteService } from './services/review-helpful-vote.service';
import { ReviewInvitationService } from './services/review-invitation.service';
import { ReviewItemRatingService } from './services/review-item-rating.service';
import { ReviewModerationService } from './services/review-moderation.service';
import { ReviewReplyService } from './services/review-reply.service';
import { ReviewService } from './services/review.service';

const CONTROLLERS = [
  ReviewPublicController,
  ReviewCustomerController,
  ReviewOwnerController,
  ReviewAdminController,
];

const REPOSITORIES = [
  ReviewRepository,
  ReviewItemRatingRepository,
  ReviewMediaAttachmentRepository,
  ReviewReplyRepository,
  ReviewHelpfulVoteRepository,
  ReviewFlagRepository,
  ReviewDisputeRepository,
  SalonRatingSummaryRepository,
  BranchRatingSummaryRepository,
  StaffRatingSummaryRepository,
  ServiceRatingSummaryRepository,
  ReviewInvitationRepository,
];

const DOMAIN_SERVICES = [
  ReviewService,
  ReviewItemRatingService,
  ReviewReplyService,
  ReviewHelpfulVoteService,
  ReviewModerationService,
  ReviewDisputeService,
  SalonRatingService,
  BranchRatingService,
  StaffRatingService,
  ServiceRatingService,
  ReviewInvitationService,
];

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    SharedCacheModule,
    EventsModule,
    TransactionModule,
  ],
  controllers: [...CONTROLLERS],
  providers: [
    ...REPOSITORIES,
    ...DOMAIN_SERVICES,
  ],
  exports: [
    ...REPOSITORIES,
    ...DOMAIN_SERVICES,
  ],
})
export class ReviewsModule {}
