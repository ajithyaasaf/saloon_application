import { Injectable, Logger } from '@nestjs/common';
import { StaffServiceAssignment } from '@prisma/client';
import { CACHE_KEYS } from '../../../common/constants/cache-keys.constant';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { AssignServiceDto } from '../dto/assign-service.dto';
import { StaffServiceAssignedEvent } from '../events/staff-service-assigned.event';
import { StaffBranchAssignmentRepository } from '../repositories/staff-branch-assignment.repository';
import { StaffServiceAssignmentRepository } from '../repositories/staff-service-assignment.repository';

/**
 * ServiceAssignmentService — Domain business logic for staff service capabilities.
 *
 * Architecture ref: Phase 12.0 & Phase 12.3
 */
@Injectable()
export class ServiceAssignmentService {
  private readonly logger = new Logger(ServiceAssignmentService.name);

  constructor(
    private readonly serviceAssignmentRepository: StaffServiceAssignmentRepository,
    private readonly branchAssignmentRepository: StaffBranchAssignmentRepository,
    private readonly prisma: PrismaService,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBusService: EventBusService,
  ) {}

  public async assignService(dto: AssignServiceDto, actorId?: string): Promise<StaffServiceAssignment> {
    if (!dto.staffId) throw new ValidationException('Staff ID is required');
    if (!dto.branchServiceId) throw new ValidationException('BranchService ID is required');

    const existingAssignment = await this.serviceAssignmentRepository.findAssignment(dto.staffId, dto.branchServiceId);
    if (existingAssignment && existingAssignment.isActive && !existingAssignment.deletedAt) {
      throw new ConflictException(
        ERROR_CODES.DATABASE.UNIQUE_VIOLATION,
        `Service capability ${dto.branchServiceId} is already assigned to staff ${dto.staffId}`,
      );
    }

    const branchService = await this.prisma.branchService.findFirst({
      where: { id: dto.branchServiceId, deletedAt: null },
    });
    if (!branchService) {
      throw new ResourceNotFoundException(ERROR_CODES.SERVICE.NOT_FOUND, `BranchService with ID ${dto.branchServiceId} not found`);
    }

    const activeBranchAssignments = await this.branchAssignmentRepository.findAssignments(dto.staffId);
    const isBranchAssigned = activeBranchAssignments.some((a) => a.branchId === branchService.branchId);
    if (!isBranchAssigned) {
      throw new ValidationException(
        `Staff member ${dto.staffId} is not assigned to branch ${branchService.branchId} offering service ${dto.branchServiceId}`,
      );
    }

    const created = await this.transactionService.run(async (tx) => {
      const assignment = await this.serviceAssignmentRepository.create(
        {
          staffId: dto.staffId,
          branchServiceId: dto.branchServiceId,
          isActive: true,
          assignedAt: new Date(),
          createdById: actorId ?? null,
          updatedById: actorId ?? null,
        },
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        action: 'SERVICE_ASSIGNED',
        entityType: 'StaffServiceAssignment',
        entityId: assignment.id,
        actorId,
        newState: { staffId: dto.staffId, branchServiceId: dto.branchServiceId },
      });

      return assignment;
    });

    await this.eventBusService.publish(new StaffServiceAssignedEvent(created.staffId, created.branchServiceId));

    return created;
  }

  public async removeService(id: string, expectedVersion: number, actorId?: string): Promise<void> {
    const existing = await this.serviceAssignmentRepository.findById(id);
    if (!existing) {
      throw new ResourceNotFoundException(ERROR_CODES.SERVICE.NOT_FOUND, `StaffServiceAssignment with ID ${id} not found`);
    }

    await this.transactionService.run(async (tx) => {
      await this.serviceAssignmentRepository.softDelete(id, expectedVersion, tx);

      await this.auditService.logInTransaction(tx, {
        action: 'SERVICE_ASSIGNED',
        entityType: 'StaffServiceAssignment',
        entityId: id,
        actorId,
        newState: { deletedAt: new Date(), isActive: false },
      });
    });
  }

  public async listAssignments(staffId: string): Promise<StaffServiceAssignment[]> {
    return this.serviceAssignmentRepository.findByStaff(staffId);
  }
}
