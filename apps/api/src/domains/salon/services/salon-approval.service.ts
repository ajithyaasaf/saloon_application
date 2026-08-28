import { Injectable, Logger } from '@nestjs/common';
import { Salon } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ForbiddenOperationException } from '../../../common/exceptions/forbidden-operation.exception';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { CACHE_KEYS } from '../../../shared/cache/constants/cache-keys.constant';
import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { NotificationService } from '../../../shared/notification/notification.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { BranchRepository } from '../repositories/branch.repository';
import { BusinessHoursRepository } from '../repositories/business-hours.repository';
import { SalonRepository } from '../repositories/salon.repository';

class SalonSubmittedEvent extends BaseDomainEvent<{ salonId: string }> {
  constructor(salonId: string) {
    super('salon.submitted.v1', salonId, 1, { salonId });
  }
}

class SalonApprovedEvent extends BaseDomainEvent<{ salonId: string }> {
  constructor(salonId: string) {
    super('salon.approved.v1', salonId, 1, { salonId });
  }
}

class SalonRejectedEvent extends BaseDomainEvent<{ salonId: string; reason: string }> {
  constructor(salonId: string, reason: string) {
    super('salon.rejected.v1', salonId, 1, { salonId, reason });
  }
}

/**
 * SalonApprovalService — Manages state transitions and approval workflow for Salons.
 *
 * State Transitions:
 * DRAFT -> PENDING_APPROVAL -> APPROVED / REJECTED -> SUSPENDED -> ARCHIVED
 *
 * Architecture ref: Phase 10.0 & Phase 10.3
 */
@Injectable()
export class SalonApprovalService {
  private readonly logger = new Logger(SalonApprovalService.name);

  constructor(
    private readonly salonRepository: SalonRepository,
    private readonly branchRepository: BranchRepository,
    private readonly businessHoursRepository: BusinessHoursRepository,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBusService: EventBusService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Submits a DRAFT salon for Super Admin review after profile completeness validation.
   */
  public async submitForApproval(salonId: string, ownerId: string): Promise<Salon> {
    const salon = await this.salonRepository.findById(salonId);
    if (!salon) throw new ResourceNotFoundException(ERROR_CODES.SALON.NOT_FOUND, `Salon ${salonId} not found`);

    if (salon.ownerId !== ownerId) {
      throw new ForbiddenOperationException('You do not own this salon profile');
    }

    if (salon.status !== 'DRAFT' && salon.status !== 'REJECTED') {
      throw new ValidationException(`Cannot submit salon with status ${salon.status}`);
    }

    // Validate Completeness: Primary Branch & Address
    const primaryBranch = await this.branchRepository.findPrimaryBranch(salonId);
    if (!primaryBranch) {
      throw new ValidationException('Salon submission requires a primary branch');
    }

    if (!primaryBranch.addressLine1 || !primaryBranch.city || !primaryBranch.pincode) {
      throw new ValidationException('Primary branch address must be completely filled out');
    }

    // Validate Completeness: Working Hours
    const hours = await this.businessHoursRepository.findHoursByBranchId(primaryBranch.id);
    if (hours.length < 7) {
      throw new ValidationException('Salon primary branch must have 7-day working hours configured');
    }

    const updated = await this.transactionService.run(async (tx) => {
      const res = await this.salonRepository.update(salonId, salon.version, { status: 'PENDING_APPROVAL' }, tx);
      await this.auditService.logInTransaction(tx, {
        action: 'SALON_SUBMITTED',
        entityType: 'Salon',
        entityId: salonId,
        actorId: ownerId,
        actorRole: 'SALON_OWNER',
        previousState: { status: salon.status },
        newState: { status: 'PENDING_APPROVAL' },
      });
      return res;
    });

    await this.cacheService.delete(CACHE_KEYS.SALON_PROFILE(salonId));
    await this.eventBusService.publish(new SalonSubmittedEvent(salonId));

    return updated;
  }

  /**
   * Super Admin approves a PENDING_APPROVAL salon.
   */
  public async approveSalon(salonId: string, adminUserId: string): Promise<Salon> {
    const salon = await this.salonRepository.findById(salonId);
    if (!salon) throw new ResourceNotFoundException(ERROR_CODES.SALON.NOT_FOUND, `Salon ${salonId} not found`);

    if (salon.status !== 'PENDING_APPROVAL') {
      throw new ValidationException(`Cannot approve salon with status ${salon.status}`);
    }

    const updated = await this.transactionService.run(async (tx) => {
      const res = await this.salonRepository.update(salonId, salon.version, { status: 'APPROVED' }, tx);
      await this.auditService.logInTransaction(tx, {
        action: 'SALON_APPROVED',
        entityType: 'Salon',
        entityId: salonId,
        actorId: adminUserId,
        actorRole: 'SUPER_ADMIN',
        previousState: { status: 'PENDING_APPROVAL' },
        newState: { status: 'APPROVED' },
      });
      return res;
    });

    await this.cacheService.delete(CACHE_KEYS.SALON_PROFILE(salonId));
    await this.eventBusService.publish(new SalonApprovedEvent(salonId));

    // Send Notification
    await this.notificationService.send({
      channel: 'EMAIL',
      recipient: salon.ownerId,
      templateId: 'SALON_APPROVED_EMAIL',
      templateVariables: { brandName: salon.brandName },
    });

    return updated;
  }

  /**
   * Super Admin rejects a PENDING_APPROVAL salon.
   */
  public async rejectSalon(salonId: string, adminUserId: string, reason: string): Promise<Salon> {
    if (!reason) throw new ValidationException('Rejection reason is required');

    const salon = await this.salonRepository.findById(salonId);
    if (!salon) throw new ResourceNotFoundException(ERROR_CODES.SALON.NOT_FOUND, `Salon ${salonId} not found`);

    if (salon.status !== 'PENDING_APPROVAL') {
      throw new ValidationException(`Cannot reject salon with status ${salon.status}`);
    }

    const updated = await this.transactionService.run(async (tx) => {
      const res = await this.salonRepository.update(salonId, salon.version, { status: 'REJECTED' }, tx);
      await this.auditService.logInTransaction(tx, {
        action: 'SALON_REJECTED',
        entityType: 'Salon',
        entityId: salonId,
        actorId: adminUserId,
        actorRole: 'SUPER_ADMIN',
        previousState: { status: 'PENDING_APPROVAL' },
        newState: { status: 'REJECTED', reason },
      });
      return res;
    });

    await this.cacheService.delete(CACHE_KEYS.SALON_PROFILE(salonId));
    await this.eventBusService.publish(new SalonRejectedEvent(salonId, reason));

    // Send Notification
    await this.notificationService.send({
      channel: 'EMAIL',
      recipient: salon.ownerId,
      templateId: 'SALON_REJECTED_EMAIL',
      templateVariables: { brandName: salon.brandName, reason },
    });

    return updated;
  }
}
