import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';
import { SalonAdminController } from './controllers/salon-admin.controller';
import { SalonOwnerController } from './controllers/salon-owner.controller';
import { SalonPublicController } from './controllers/salon-public.controller';
import { BranchRepository } from './repositories/branch.repository';
import { BusinessHoursRepository } from './repositories/business-hours.repository';
import { SalonRepository } from './repositories/salon.repository';
import { BranchService } from './services/branch.service';
import { SalonApprovalService } from './services/salon-approval.service';
import { SalonService } from './services/salon.service';
import { WorkingHoursService } from './services/working-hours.service';

/**
 * SalonModule — NestJS module for Salon Management domain.
 *
 * Encapsulates public, owner, and admin endpoints, domain services, and repository layers.
 * Depends on SharedModule for transaction, audit, cache, events, storage, and notification services.
 *
 * Architecture ref: Phase 10.0 & Phase 10.4
 */
@Module({
  imports: [SharedModule],
  controllers: [SalonPublicController, SalonOwnerController, SalonAdminController],
  providers: [
    SalonRepository,
    BranchRepository,
    BusinessHoursRepository,
    SalonService,
    BranchService,
    WorkingHoursService,
    SalonApprovalService,
  ],
  exports: [SalonService, BranchService, WorkingHoursService, SalonApprovalService],
})
export class SalonModule { }
