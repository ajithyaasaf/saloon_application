import { Injectable, Logger } from '@nestjs/common';
import { StaffBranchAssignment } from '@prisma/client';
import { CACHE_KEYS } from '../../../common/constants/cache-keys.constant';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { AssignBranchDto } from '../dto/assign-branch.dto';
import { BranchAssignedEvent } from '../events/branch-assigned.event';
import { PrimaryBranchChangedEvent } from '../events/primary-branch-changed.event';
import { StaffBranchAssignmentRepository } from '../repositories/staff-branch-assignment.repository';

/**
 * BranchAssignmentService — Domain business logic for staff branch assignments.
 *
 * Architecture ref: Phase 12.0 & Phase 12.3
 */
@Injectable()
export class BranchAssignmentService {
  private readonly logger = new Logger(BranchAssignmentService.name);

  constructor(
    private readonly assignmentRepository: StaffBranchAssignmentRepository,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBusService: EventBusService,
  ) {}

  public async assignBranch(dto: AssignBranchDto, actorId?: string): Promise<StaffBranchAssignment> {
    if (!dto.staffId) throw new ValidationException('Staff ID is required');
    if (!dto.branchId) throw new ValidationException('Branch ID is required');

    const existingAssignments = await this.assignmentRepository.findAssignments(dto.staffId);
    const shouldBePrimary = dto.isPrimary || existingAssignments.length === 0;

    const created = await this.transactionService.run(async (tx) => {
      if (shouldBePrimary && existingAssignments.length > 0) {
        for (const existing of existingAssignments) {
          if (existing.isPrimary) {
            await this.assignmentRepository.update(existing.id, existing.version, { isPrimary: false }, tx);
          }
        }
      }

      const assignment = await this.assignmentRepository.create(
        {
          staffId: dto.staffId,
          branchId: dto.branchId,
          isPrimary: shouldBePrimary,
          startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          isActive: true,
          createdById: actorId ?? null,
          updatedById: actorId ?? null,
        },
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        action: 'BRANCH_ASSIGNED',
        entityType: 'StaffBranchAssignment',
        entityId: assignment.id,
        actorId,
        newState: { staffId: dto.staffId, branchId: dto.branchId, isPrimary: shouldBePrimary },
      });

      return assignment;
    });

    await this.cacheService.delete(CACHE_KEYS.BRANCH_ROSTER(dto.branchId));
    await this.eventBusService.publish(new BranchAssignedEvent(created.staffId, created.branchId, created.isPrimary));

    return created;
  }

  public async changePrimaryBranch(staffId: string, newPrimaryBranchId: string, actorId?: string): Promise<StaffBranchAssignment> {
    const assignments = await this.assignmentRepository.findAssignments(staffId);
    const target = assignments.find((a) => a.branchId === newPrimaryBranchId);

    if (!target) {
      throw new ValidationException(`Staff member ${staffId} is not assigned to branch ${newPrimaryBranchId}`);
    }

    const updated = await this.transactionService.run(async (tx) => {
      for (const a of assignments) {
        if (a.isPrimary && a.id !== target.id) {
          await this.assignmentRepository.update(a.id, a.version, { isPrimary: false, updatedById: actorId ?? null }, tx);
        }
      }

      const result = await this.assignmentRepository.update(
        target.id,
        target.version,
        { isPrimary: true, updatedById: actorId ?? null },
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        action: 'PRIMARY_BRANCH_CHANGED',
        entityType: 'StaffBranchAssignment',
        entityId: result.id,
        actorId,
        newState: { staffId, newPrimaryBranchId },
      });

      return result;
    });

    await this.cacheService.delete(CACHE_KEYS.BRANCH_ROSTER(newPrimaryBranchId));
    await this.eventBusService.publish(new PrimaryBranchChangedEvent(staffId, newPrimaryBranchId));

    return updated;
  }

  public async removeBranchAssignment(id: string, expectedVersion: number, actorId?: string): Promise<void> {
    const existing = await this.assignmentRepository.findById(id);
    if (!existing) {
      throw new ResourceNotFoundException(ERROR_CODES.BRANCH.NOT_FOUND, `StaffBranchAssignment with ID ${id} not found`);
    }

    const activeAssignments = await this.assignmentRepository.findAssignments(existing.staffId);
    if (activeAssignments.length <= 1) {
      throw new ValidationException('Cannot remove the last active branch assignment for staff member');
    }

    await this.transactionService.run(async (tx) => {
      await this.assignmentRepository.softDelete(id, expectedVersion, tx);

      // If removed assignment was primary, promote the next available active assignment
      if (existing.isPrimary) {
        const remaining = activeAssignments.find((a) => a.id !== id);
        if (remaining) {
          await this.assignmentRepository.update(remaining.id, remaining.version, { isPrimary: true }, tx);
        }
      }

      await this.auditService.logInTransaction(tx, {
        action: 'BRANCH_ASSIGNED',
        entityType: 'StaffBranchAssignment',
        entityId: id,
        actorId,
        newState: { deletedAt: new Date(), isActive: false },
      });
    });

    await this.cacheService.delete(CACHE_KEYS.BRANCH_ROSTER(existing.branchId));
  }
}
