import { Injectable, Logger } from '@nestjs/common';
import { EmploymentStatus, Staff } from '@prisma/client';
import * as crypto from 'crypto';
import { CACHE_KEYS } from '../../../common/constants/cache-keys.constant';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { NotificationService } from '../../../shared/notification/notification.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { AcceptInvitationDto } from '../dto/accept-invitation.dto';
import { InviteStaffDto } from '../dto/invite-staff.dto';
import { StaffActivatedEvent } from '../events/staff-activated.event';
import { StaffInvitedEvent } from '../events/staff-invited.event';
import { StaffInvitationRepository } from '../repositories/staff-invitation.repository';
import { StaffRepository } from '../repositories/staff.repository';

/**
 * InvitationService — Domain business logic for staff invitations.
 *
 * Architecture ref: Phase 12.0 & Phase 12.3
 */
@Injectable()
export class InvitationService {
  private readonly logger = new Logger(InvitationService.name);

  constructor(
    private readonly staffRepository: StaffRepository,
    private readonly invitationRepository: StaffInvitationRepository,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBusService: EventBusService,
    private readonly notificationService: NotificationService,
  ) {}

  public async inviteStaff(dto: InviteStaffDto, actorId?: string): Promise<{ staff: Staff; token: string }> {
    if (!dto.inviteEmail && !dto.invitePhone) {
      throw new ValidationException('Must provide either inviteEmail or invitePhone');
    }

    let staff: Staff | null = null;
    if (dto.staffId) {
      staff = await this.staffRepository.findById(dto.staffId);
      if (!staff) {
        throw new ResourceNotFoundException(ERROR_CODES.STAFF.NOT_FOUND, `Staff with ID ${dto.staffId} not found`);
      }
    } else {
      let code = dto.employeeCode;
      if (!code) {
        const count = await this.staffRepository.countBySalon(dto.salonId);
        code = `EMP${String(count + 1).padStart(3, '0')}`;
      }
      staff = await this.staffRepository.create({
        salonId: dto.salonId,
        displayName: dto.displayName,
        role: dto.role,
        employeeCode: code,
        employmentStatus: EmploymentStatus.INVITED,
        createdById: actorId ?? null,
        updatedById: actorId ?? null,
      });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.transactionService.run(async (tx) => {
      // Invalidate existing unused tokens for staff
      await this.invitationRepository.invalidateUnusedForStaff(staff.id, tx);

      // Create new token record
      await this.invitationRepository.create(
        {
          staffId: staff.id,
          tokenHash,
          expiresAt,
        },
        tx,
      );

      // Update staff status to INVITED
      await this.staffRepository.update(
        staff.id,
        staff.version,
        {
          employmentStatus: EmploymentStatus.INVITED,
          invitationExpiresAt: expiresAt,
          updatedById: actorId ?? null,
        },
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        action: 'STAFF_INVITED',
        entityType: 'Staff',
        entityId: staff.id,
        actorId,
        newState: { inviteEmail: dto.inviteEmail, invitePhone: dto.invitePhone, expiresAt },
      });
    });

    await this.cacheService.delete(CACHE_KEYS.STAFF_PROFILE(staff.id));
    await this.eventBusService.publish(new StaffInvitedEvent(staff.id, staff.salonId, dto.invitePhone, dto.inviteEmail, expiresAt));

    // Send async notification out-of-transaction
    if (dto.inviteEmail) {
      await this.notificationService.send({
        recipient: dto.inviteEmail,
        channel: 'EMAIL',
        templateId: 'STAFF_INVITATION',
        templateVariables: { staffName: staff.displayName, invitationToken: rawToken },
      });
    }

    return { staff, token: rawToken };
  }

  public async acceptInvitation(dto: AcceptInvitationDto): Promise<Staff> {
    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');
    const tokenRecord = await this.invitationRepository.findByHash(tokenHash);

    if (!tokenRecord || tokenRecord.usedAt || tokenRecord.expiresAt < new Date()) {
      throw new ValidationException('Invalid or expired invitation token');
    }

    const staff = await this.staffRepository.findById(tokenRecord.staffId);
    if (!staff) {
      throw new ResourceNotFoundException(ERROR_CODES.STAFF.NOT_FOUND, `Staff with ID ${tokenRecord.staffId} not found`);
    }

    const activated = await this.transactionService.run(async (tx) => {
      await this.invitationRepository.markUsed(tokenRecord.id, tx);

      const result = await this.staffRepository.update(
        staff.id,
        staff.version,
        {
          userId: dto.userId,
          employmentStatus: EmploymentStatus.ACTIVE,
          joinedAt: new Date(),
          updatedById: dto.userId,
        },
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        action: 'STAFF_UPDATED',
        entityType: 'Staff',
        entityId: staff.id,
        actorId: dto.userId,
        newState: { employmentStatus: EmploymentStatus.ACTIVE, userId: dto.userId },
      });

      return result;
    });

    await this.cacheService.delete(CACHE_KEYS.STAFF_PROFILE(staff.id));
    await this.cacheService.delete(CACHE_KEYS.BRANCH_ROSTER(activated.salonId));
    await this.eventBusService.publish(new StaffActivatedEvent(activated.id, activated.salonId, dto.userId));

    return activated;
  }

  public async resendInvitation(staffId: string, actorId?: string): Promise<{ token: string; expiresAt: Date }> {
    const staff = await this.staffRepository.findById(staffId);
    if (!staff) {
      throw new ResourceNotFoundException(ERROR_CODES.STAFF.NOT_FOUND, `Staff with ID ${staffId} not found`);
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.transactionService.run(async (tx) => {
      await this.invitationRepository.invalidateUnusedForStaff(staffId, tx);

      await this.invitationRepository.create(
        {
          staffId,
          tokenHash,
          expiresAt,
        },
        tx,
      );

      await this.staffRepository.update(
        staffId,
        staff.version,
        {
          invitationExpiresAt: expiresAt,
          updatedById: actorId ?? null,
        },
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        action: 'STAFF_INVITED',
        entityType: 'Staff',
        entityId: staffId,
        actorId,
        newState: { expiresAt, isResend: true },
      });
    });

    await this.cacheService.delete(CACHE_KEYS.STAFF_PROFILE(staffId));
    await this.eventBusService.publish(new StaffInvitedEvent(staff.id, staff.salonId, undefined, undefined, expiresAt));

    return { token: rawToken, expiresAt };
  }

  public async expireInvitations(): Promise<number> {
    return this.invitationRepository.deleteExpired();
  }
}
