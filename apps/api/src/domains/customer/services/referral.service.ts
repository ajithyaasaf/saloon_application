import { Injectable, Logger } from '@nestjs/common';
import { ReferralStatus } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { AuditService } from '../../../shared/audit/audit.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { CreateReferralDto } from '../dto/customer-referral.dto';
import { CustomerReferralEntity } from '../entities/customer-referral.entity';
import { ReferralCreatedEvent, ReferralRewardedEvent } from '../events/customer-events.event';
import { CustomerLoyaltyService } from './customer-loyalty.service';
import { CustomerProfileRepository } from '../repositories/customer-profile.repository';
import { CustomerReferralRepository } from '../repositories/customer-referral.repository';
import { ReferralRewardRepository } from '../repositories/referral-reward.repository';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    private readonly referralRepo: CustomerReferralRepository,
    private readonly rewardRepo: ReferralRewardRepository,
    private readonly customerRepo: CustomerProfileRepository,
    private readonly loyaltyService: CustomerLoyaltyService,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly eventBus: EventBusService,
  ) {}

  public async createReferral(dto: CreateReferralDto, actorUserId: string): Promise<CustomerReferralEntity> {
    const referrer = await this.customerRepo.findById(dto.referrerCustomerProfileId);
    if (!referrer) {
      throw new ResourceNotFoundException(ERROR_CODES.USER.NOT_FOUND, 'Referrer customer profile not found');
    }

    if (referrer.phone === dto.referredPhone) {
      throw new ValidationException('Self-referral is strictly prohibited');
    }

    const created = await this.transactionService.run(async (tx) => {
      const referral = await this.referralRepo.create(dto, actorUserId, tx);
      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'SALON_OWNER',
        action: 'CREATE',
        entityType: 'CustomerReferral',
        entityId: referral.id,
        newState: referral as any,
      });
      return referral;
    });

    await this.eventBus.publish(
      new ReferralCreatedEvent(
        {
          customerReferralId: created.id,
          referrerCustomerProfileId: created.referrerCustomerProfileId,
          referredPhone: created.referredPhone,
        },
        actorUserId,
      ),
    );

    return new CustomerReferralEntity(created);
  }

  public async rewardReferral(id: string, actorUserId: string): Promise<CustomerReferralEntity> {
    const referral = await this.referralRepo.findById(id);
    if (!referral) {
      throw new ResourceNotFoundException(ERROR_CODES.DATABASE.UNHANDLED_ERROR, 'Customer referral record not found');
    }

    if (referral.status === ReferralStatus.REWARDED) {
      throw new ConflictException(ERROR_CODES.CRM.CUSTOMER_EXISTS, 'Referral reward has already been claimed/rewarded');
    }

    const updated = await this.transactionService.run(async (tx) => {
      const updatedReferral = await this.referralRepo.update(id, ReferralStatus.REWARDED, undefined, actorUserId, referral.version, tx);

      if (referral.rewardPoints > 0) {
        await this.rewardRepo.create(id, referral.referrerCustomerProfileId, 'POINTS', referral.rewardPoints, tx);
      }

      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'SALON_OWNER',
        action: 'UPDATE',
        entityType: 'CustomerReferral',
        entityId: id,
        previousState: { status: referral.status },
        newState: { status: updatedReferral.status },
      });

      return updatedReferral;
    });

    if (referral.rewardPoints > 0) {
      await this.loyaltyService.earnPoints(referral.referrerCustomerProfileId, referral.rewardPoints, 'REFERRAL', id, actorUserId);
    }

    await this.eventBus.publish(
      new ReferralRewardedEvent(
        {
          customerReferralId: updated.id,
          referrerCustomerProfileId: updated.referrerCustomerProfileId,
          rewardPoints: updated.rewardPoints,
          rewardAmount: updated.rewardAmount,
        },
        actorUserId,
      ),
    );

    return new CustomerReferralEntity(updated);
  }

  public async expireReferral(id: string, actorUserId: string): Promise<CustomerReferralEntity> {
    const referral = await this.referralRepo.findById(id);
    if (!referral) {
      throw new ResourceNotFoundException(ERROR_CODES.DATABASE.UNHANDLED_ERROR, 'Customer referral record not found');
    }

    const updated = await this.transactionService.run(async (tx) => {
      return this.referralRepo.update(id, ReferralStatus.EXPIRED, undefined, actorUserId, referral.version, tx);
    });

    return new CustomerReferralEntity(updated);
  }
}
