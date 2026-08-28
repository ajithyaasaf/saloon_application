import { Injectable, Logger } from '@nestjs/common';
import { MembershipStatus } from '@prisma/client';
import { CACHE_KEYS } from '../../../common/constants/cache-keys.constant';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { CreateCustomerMembershipDto, UpdateCustomerMembershipDto } from '../dto/customer-membership.dto';
import { CreateMembershipPlanDto, UpdateMembershipPlanDto } from '../dto/membership-plan.dto';
import { CustomerMembershipEntity, MembershipPlanEntity } from '../entities/customer-membership.entity';
import { MembershipCancelledEvent, MembershipCreatedEvent, MembershipExpiredEvent } from '../events/customer-events.event';
import { CustomerMembershipRepository } from '../repositories/customer-membership.repository';
import { CustomerProfileRepository } from '../repositories/customer-profile.repository';
import { MembershipPlanRepository } from '../repositories/membership-plan.repository';

@Injectable()
export class MembershipService {
  private readonly logger = new Logger(MembershipService.name);

  constructor(
    private readonly planRepo: MembershipPlanRepository,
    private readonly membershipRepo: CustomerMembershipRepository,
    private readonly customerRepo: CustomerProfileRepository,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBus: EventBusService,
  ) {}

  public async createPlan(dto: CreateMembershipPlanDto, actorUserId: string): Promise<MembershipPlanEntity> {
    const created = await this.transactionService.run(async (tx) => {
      const plan = await this.planRepo.create(dto, actorUserId, tx);
      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'SALON_OWNER',
        action: 'CREATE',
        entityType: 'MembershipPlan',
        entityId: plan.id,
        newState: plan as any,
      });
      return plan;
    });

    return new MembershipPlanEntity(created);
  }

  public async updatePlan(id: string, dto: UpdateMembershipPlanDto, actorUserId: string): Promise<MembershipPlanEntity> {
    const existing = await this.planRepo.findById(id);
    if (!existing) {
      throw new ResourceNotFoundException(ERROR_CODES.DATABASE.UNHANDLED_ERROR, 'Membership plan not found');
    }

    const updated = await this.transactionService.run(async (tx) => {
      const plan = await this.planRepo.update(id, dto, actorUserId, tx);
      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'SALON_OWNER',
        action: 'UPDATE',
        entityType: 'MembershipPlan',
        entityId: id,
        previousState: existing as any,
        newState: plan as any,
      });
      return plan;
    });

    return new MembershipPlanEntity(updated);
  }

  public async assignMembership(dto: CreateCustomerMembershipDto, actorUserId: string): Promise<CustomerMembershipEntity> {
    const customer = await this.customerRepo.findById(dto.customerProfileId);
    if (!customer) {
      throw new ResourceNotFoundException(ERROR_CODES.USER.NOT_FOUND, 'Customer profile not found');
    }

    const activeMembership = await this.membershipRepo.findActiveMembership(dto.customerProfileId);
    if (activeMembership) {
      throw new ConflictException(ERROR_CODES.CRM.CUSTOMER_EXISTS, 'Customer already has an active membership');
    }

    const plan = await this.planRepo.findById(dto.membershipPlanId);
    if (!plan || !plan.isActive) {
      throw new ResourceNotFoundException(ERROR_CODES.DATABASE.UNHANDLED_ERROR, 'Membership plan not found or inactive');
    }

    const created = await this.transactionService.run(async (tx) => {
      const membership = await this.membershipRepo.create(dto, actorUserId, tx);
      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'SALON_OWNER',
        action: 'CREATE',
        entityType: 'CustomerMembership',
        entityId: membership.id,
        newState: membership as any,
      });
      return membership;
    });

    await this.cacheService.delete(CACHE_KEYS.CUSTOMER_MEMBERSHIP(dto.customerProfileId));
    await this.eventBus.publish(
      new MembershipCreatedEvent(
        {
          customerMembershipId: created.id,
          customerProfileId: created.customerProfileId,
          membershipPlanId: created.membershipPlanId,
          endDate: created.endDate,
        },
        actorUserId,
      ),
    );

    return new CustomerMembershipEntity(created);
  }

  public async pauseMembership(id: string, actorUserId: string): Promise<CustomerMembershipEntity> {
    const existing = await this.membershipRepo.findById(id);
    if (!existing) {
      throw new ResourceNotFoundException(ERROR_CODES.DATABASE.UNHANDLED_ERROR, 'Customer membership not found');
    }

    const updated = await this.transactionService.run(async (tx) => {
      const membership = await this.membershipRepo.update(id, { version: existing.version, status: MembershipStatus.PAUSED }, actorUserId, tx);
      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'SALON_OWNER',
        action: 'UPDATE',
        entityType: 'CustomerMembership',
        entityId: id,
        previousState: { status: existing.status },
        newState: { status: membership.status },
      });
      return membership;
    });

    await this.cacheService.delete(CACHE_KEYS.CUSTOMER_MEMBERSHIP(existing.customerProfileId));
    return new CustomerMembershipEntity(updated);
  }

  public async resumeMembership(id: string, actorUserId: string): Promise<CustomerMembershipEntity> {
    const existing = await this.membershipRepo.findById(id);
    if (!existing) {
      throw new ResourceNotFoundException(ERROR_CODES.DATABASE.UNHANDLED_ERROR, 'Customer membership not found');
    }

    const updated = await this.transactionService.run(async (tx) => {
      const membership = await this.membershipRepo.update(id, { version: existing.version, status: MembershipStatus.ACTIVE }, actorUserId, tx);
      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'SALON_OWNER',
        action: 'UPDATE',
        entityType: 'CustomerMembership',
        entityId: id,
        previousState: { status: existing.status },
        newState: { status: membership.status },
      });
      return membership;
    });

    await this.cacheService.delete(CACHE_KEYS.CUSTOMER_MEMBERSHIP(existing.customerProfileId));
    return new CustomerMembershipEntity(updated);
  }

  public async expireMembership(id: string): Promise<CustomerMembershipEntity> {
    const existing = await this.membershipRepo.findById(id);
    if (!existing) {
      throw new ResourceNotFoundException(ERROR_CODES.DATABASE.UNHANDLED_ERROR, 'Customer membership not found');
    }

    const updated = await this.transactionService.run(async (tx) => {
      const membership = await this.membershipRepo.update(id, { version: existing.version, status: MembershipStatus.EXPIRED }, 'SYSTEM', tx);
      return membership;
    });

    await this.cacheService.delete(CACHE_KEYS.CUSTOMER_MEMBERSHIP(existing.customerProfileId));
    await this.eventBus.publish(
      new MembershipExpiredEvent({
        customerMembershipId: updated.id,
        customerProfileId: updated.customerProfileId,
      }),
    );

    return new CustomerMembershipEntity(updated);
  }

  public async cancelMembership(id: string, actorUserId: string): Promise<CustomerMembershipEntity> {
    const existing = await this.membershipRepo.findById(id);
    if (!existing) {
      throw new ResourceNotFoundException(ERROR_CODES.DATABASE.UNHANDLED_ERROR, 'Customer membership not found');
    }

    const updated = await this.transactionService.run(async (tx) => {
      const membership = await this.membershipRepo.update(id, { version: existing.version, status: MembershipStatus.CANCELLED }, actorUserId, tx);
      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'SALON_OWNER',
        action: 'UPDATE',
        entityType: 'CustomerMembership',
        entityId: id,
        previousState: { status: existing.status },
        newState: { status: membership.status },
      });
      return membership;
    });

    await this.cacheService.delete(CACHE_KEYS.CUSTOMER_MEMBERSHIP(existing.customerProfileId));
    await this.eventBus.publish(
      new MembershipCancelledEvent(
        {
          customerMembershipId: updated.id,
          customerProfileId: updated.customerProfileId,
        },
        actorUserId,
      ),
    );

    return new CustomerMembershipEntity(updated);
  }
}
