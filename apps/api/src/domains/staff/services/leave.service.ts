import { Injectable, Logger } from '@nestjs/common';
import { LeaveStatus, StaffLeave } from '@prisma/client';
import { CACHE_KEYS } from '../../../common/constants/cache-keys.constant';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { CreateLeaveDto } from '../dto/create-leave.dto';
import { StaffLeaveEntity } from '../entities/staff-leave.entity';
import { LeaveApprovedEvent } from '../events/leave-approved.event';
import { LeaveRejectedEvent } from '../events/leave-rejected.event';
import { LeaveRequestedEvent } from '../events/leave-requested.event';
import { StaffLeaveRepository } from '../repositories/staff-leave.repository';

/**
 * LeaveService — Domain business logic for staff leave requests and approvals.
 *
 * Architecture ref: Phase 12.0 & Phase 12.3
 */
@Injectable()
export class LeaveService {
  private readonly logger = new Logger(LeaveService.name);

  constructor(
    private readonly leaveRepository: StaffLeaveRepository,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBusService: EventBusService,
  ) {}

  public async requestLeave(dto: CreateLeaveDto, staffId: string, actorId?: string): Promise<StaffLeave> {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    if (start > end) {
      throw new ValidationException(`Leave start date (${dto.startDate}) cannot be after end date (${dto.endDate})`);
    }

    if (dto.halfDayPeriod && dto.startDate !== dto.endDate) {
      throw new ValidationException('Half-day leave requires startDate and endDate to be identical');
    }

    const approvedLeaves = await this.leaveRepository.findApproved(staffId, start, end);
    if (approvedLeaves.length > 0) {
      throw new ValidationException(`Staff member ${staffId} already has an approved leave overlapping period ${dto.startDate} to ${dto.endDate}`);
    }

    const created = await this.transactionService.run(async (tx) => {
      const leave = await this.leaveRepository.create(
        {
          staffId,
          leaveType: dto.leaveType,
          startDate: start,
          endDate: end,
          halfDayPeriod: dto.halfDayPeriod ?? null,
          reason: dto.reason ?? null,
          status: LeaveStatus.PENDING,
          isBookingBlocked: false,
          createdById: actorId ?? null,
          updatedById: actorId ?? null,
        },
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        action: 'LEAVE_REQUESTED',
        entityType: 'StaffLeave',
        entityId: leave.id,
        actorId,
        newState: { staffId, leaveType: dto.leaveType, startDate: start, endDate: end },
      });

      return leave;
    });

    await this.cacheService.delete(CACHE_KEYS.STAFF_LEAVES(staffId));
    await this.eventBusService.publish(new LeaveRequestedEvent(created.id, created.staffId, created.startDate, created.endDate, created.leaveType));

    return created;
  }

  public async approveLeave(id: string, expectedVersion: number, approverId: string): Promise<StaffLeave> {
    const existing = await this.leaveRepository.findById(id);
    if (!existing) {
      throw new ResourceNotFoundException(ERROR_CODES.STAFF.NOT_FOUND, `StaffLeave with ID ${id} not found`);
    }

    const entity = new StaffLeaveEntity(existing);

    if (entity.isRejected()) {
      throw new ValidationException(`Cannot approve previously rejected leave request ${id}`);
    }

    if (entity.isApproved()) {
      throw new ValidationException(`Leave request ${id} is already approved`);
    }

    if (!entity.isPending()) {
      throw new ValidationException(`Only PENDING leave requests can be approved. Current status: ${existing.status}`);
    }

    const approved = await this.transactionService.run(async (tx) => {
      const now = new Date();
      const result = await this.leaveRepository.update(
        id,
        expectedVersion,
        {
          status: LeaveStatus.APPROVED,
          approvedById: approverId,
          approvedAt: now,
          isBookingBlocked: true,
          updatedById: approverId,
        },
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        action: 'LEAVE_APPROVED',
        entityType: 'StaffLeave',
        entityId: id,
        actorId: approverId,
        newState: { status: LeaveStatus.APPROVED, approvedById: approverId, approvedAt: now },
      });

      return result;
    });

    await this.cacheService.delete(CACHE_KEYS.STAFF_LEAVES(existing.staffId));
    await this.eventBusService.publish(new LeaveApprovedEvent(approved.id, approved.staffId, approverId, approved.startDate, approved.endDate));

    return approved;
  }

  public async rejectLeave(id: string, expectedVersion: number, approverId: string, reason: string): Promise<StaffLeave> {
    if (!reason) {
      throw new ValidationException('Rejection reason is required');
    }

    const existing = await this.leaveRepository.findById(id);
    if (!existing) {
      throw new ResourceNotFoundException(ERROR_CODES.STAFF.NOT_FOUND, `StaffLeave with ID ${id} not found`);
    }

    const entity = new StaffLeaveEntity(existing);

    if (entity.isApproved()) {
      throw new ValidationException(`Cannot reject previously approved leave request ${id}`);
    }

    if (entity.isRejected()) {
      throw new ValidationException(`Leave request ${id} is already rejected`);
    }

    if (!entity.isPending()) {
      throw new ValidationException(`Only PENDING leave requests can be rejected. Current status: ${existing.status}`);
    }

    const rejected = await this.transactionService.run(async (tx) => {
      const result = await this.leaveRepository.update(
        id,
        expectedVersion,
        {
          status: LeaveStatus.REJECTED,
          approvedById: approverId,
          rejectionReason: reason,
          isBookingBlocked: false,
          updatedById: approverId,
        },
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        action: 'LEAVE_REJECTED',
        entityType: 'StaffLeave',
        entityId: id,
        actorId: approverId,
        newState: { status: LeaveStatus.REJECTED, rejectionReason: reason },
      });

      return result;
    });

    await this.cacheService.delete(CACHE_KEYS.STAFF_LEAVES(existing.staffId));
    await this.eventBusService.publish(new LeaveRejectedEvent(rejected.id, rejected.staffId, approverId, reason));

    return rejected;
  }

  public async cancelLeave(id: string, expectedVersion: number, staffId: string): Promise<void> {
    const existing = await this.leaveRepository.findById(id);
    if (!existing) {
      throw new ResourceNotFoundException(ERROR_CODES.STAFF.NOT_FOUND, `StaffLeave with ID ${id} not found`);
    }

    if (existing.staffId !== staffId) {
      throw new ValidationException(`Staff member ${staffId} cannot cancel leave ${id} owned by staff ${existing.staffId}`);
    }

    await this.transactionService.run(async (tx) => {
      await this.leaveRepository.softDelete(id, expectedVersion, tx);

      await this.auditService.logInTransaction(tx, {
        action: 'LEAVE_REQUESTED',
        entityType: 'StaffLeave',
        entityId: id,
        actorId: staffId,
        newState: { status: LeaveStatus.CANCELLED, deletedAt: new Date() },
      });
    });

    await this.cacheService.delete(CACHE_KEYS.STAFF_LEAVES(staffId));
  }

  public async isStaffOnLeave(staffId: string, targetDate: Date = new Date()): Promise<boolean> {
    const approvedLeaves = await this.leaveRepository.findApproved(staffId, targetDate, targetDate);
    return approvedLeaves.length > 0;
  }
}
