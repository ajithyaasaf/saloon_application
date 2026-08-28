import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';
import { StaffAdminController } from './controllers/staff-admin.controller';
import { StaffOwnerController } from './controllers/staff-owner.controller';
import { StaffPublicController } from './controllers/staff-public.controller';
import { StaffBranchAssignmentRepository } from './repositories/staff-branch-assignment.repository';
import { StaffInvitationRepository } from './repositories/staff-invitation.repository';
import { StaffLeaveRepository } from './repositories/staff-leave.repository';
import { StaffServiceAssignmentRepository } from './repositories/staff-service-assignment.repository';
import { StaffWorkingHoursRepository } from './repositories/staff-working-hours.repository';
import { StaffRepository } from './repositories/staff.repository';
import { BranchAssignmentService } from './services/branch-assignment.service';
import { InvitationService } from './services/invitation.service';
import { LeaveService } from './services/leave.service';
import { ServiceAssignmentService } from './services/service-assignment.service';
import { StaffService } from './services/staff.service';
import { WorkingHoursService } from './services/working-hours.service';

/**
 * StaffModule — NestJS module for Staff Domain.
 *
 * Encapsulates public, owner, and admin endpoints, domain services, and repository layers.
 */
@Module({
  imports: [SharedModule],
  controllers: [StaffPublicController, StaffOwnerController, StaffAdminController],
  providers: [
    StaffRepository,
    StaffWorkingHoursRepository,
    StaffServiceAssignmentRepository,
    StaffLeaveRepository,
    StaffInvitationRepository,
    StaffBranchAssignmentRepository,
    StaffService,
    WorkingHoursService,
    ServiceAssignmentService,
    LeaveService,
    InvitationService,
    BranchAssignmentService,
  ],
  exports: [
    StaffRepository,
    StaffWorkingHoursRepository,
    StaffServiceAssignmentRepository,
    StaffLeaveRepository,
    StaffInvitationRepository,
    StaffBranchAssignmentRepository,
    StaffService,
    WorkingHoursService,
    ServiceAssignmentService,
    LeaveService,
    InvitationService,
    BranchAssignmentService,
  ],
})
export class StaffModule {}
