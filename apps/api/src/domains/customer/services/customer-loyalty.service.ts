import { Injectable, Logger } from '@nestjs/common';
import { LoyaltyTransactionType } from '@prisma/client';
import { CACHE_KEYS } from '../../../common/constants/cache-keys.constant';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { CustomerLoyaltyEntity, LoyaltyLedgerEntity } from '../entities/customer-loyalty.entity';
import { LoyaltyPointsEarnedEvent, LoyaltyPointsRedeemedEvent } from '../events/customer-events.event';
import { CustomerLoyaltyRepository } from '../repositories/customer-loyalty.repository';
import { CustomerProfileRepository } from '../repositories/customer-profile.repository';
import { LoyaltyLedgerRepository } from '../repositories/loyalty-ledger.repository';

@Injectable()
export class CustomerLoyaltyService {
  private readonly logger = new Logger(CustomerLoyaltyService.name);

  constructor(
    private readonly loyaltyRepo: CustomerLoyaltyRepository,
    private readonly ledgerRepo: LoyaltyLedgerRepository,
    private readonly customerRepo: CustomerProfileRepository,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBus: EventBusService,
  ) {}

  public async earnPoints(
    customerProfileId: string,
    points: number,
    referenceType?: string,
    referenceId?: string,
    actorUserId: string = 'SYSTEM',
  ): Promise<CustomerLoyaltyEntity> {
    if (points <= 0) {
      throw new ValidationException('Earn points must be positive');
    }

    const customer = await this.customerRepo.findById(customerProfileId);
    if (!customer) {
      throw new ResourceNotFoundException(ERROR_CODES.USER.NOT_FOUND, 'Customer profile not found');
    }

    let loyalty = await this.loyaltyRepo.findByCustomer(customerProfileId);

    const updated = await this.transactionService.run(async (tx) => {
      if (!loyalty) {
        loyalty = await this.loyaltyRepo.create(customerProfileId, 'SILVER', tx);
      }

      const previousBalance = loyalty.pointsBalance;
      const newBalance = previousBalance + points;
      const newLifetime = loyalty.lifetimePointsEarned + points;
      const newTier = this.calculateTier(newLifetime);

      const updatedLoyalty = await this.loyaltyRepo.update(
        customerProfileId,
        newBalance,
        newLifetime,
        newTier,
        loyalty.version,
        tx,
      );

      await this.ledgerRepo.create(
        customerProfileId,
        LoyaltyTransactionType.EARNED,
        points,
        previousBalance,
        newBalance,
        actorUserId,
        referenceType,
        referenceId,
        `Earned ${points} points`,
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'SALON_OWNER',
        action: 'UPDATE',
        entityType: 'CustomerLoyalty',
        entityId: updatedLoyalty.id,
        previousState: { pointsBalance: previousBalance, currentTier: loyalty.currentTier },
        newState: { pointsBalance: newBalance, currentTier: newTier },
      });

      return updatedLoyalty;
    });

    await this.cacheService.delete(CACHE_KEYS.CUSTOMER_LOYALTY(customerProfileId));
    await this.eventBus.publish(
      new LoyaltyPointsEarnedEvent(
        {
          customerProfileId,
          pointsEarned: points,
          newBalance: updated.pointsBalance,
          referenceType,
          referenceId,
        },
        actorUserId,
      ),
    );

    return new CustomerLoyaltyEntity(updated);
  }

  public async redeemPoints(
    customerProfileId: string,
    points: number,
    referenceType?: string,
    referenceId?: string,
    actorUserId: string = 'SYSTEM',
  ): Promise<CustomerLoyaltyEntity> {
    if (points <= 0) {
      throw new ValidationException('Redeem points must be positive');
    }

    const loyalty = await this.loyaltyRepo.findByCustomer(customerProfileId);
    if (!loyalty || loyalty.pointsBalance < points) {
      throw new ConflictException(
        ERROR_CODES.VALIDATION.INVALID_INPUT,
        `Insufficient points balance for redemption. Available: ${loyalty?.pointsBalance ?? 0}`,
      );
    }

    const updated = await this.transactionService.run(async (tx) => {
      const previousBalance = loyalty.pointsBalance;
      const newBalance = previousBalance - points;
      const currentTier = loyalty.currentTier;

      const updatedLoyalty = await this.loyaltyRepo.update(
        customerProfileId,
        newBalance,
        loyalty.lifetimePointsEarned,
        currentTier,
        loyalty.version,
        tx,
      );

      await this.ledgerRepo.create(
        customerProfileId,
        LoyaltyTransactionType.REDEEMED,
        points,
        previousBalance,
        newBalance,
        actorUserId,
        referenceType,
        referenceId,
        `Redeemed ${points} points`,
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'SALON_OWNER',
        action: 'UPDATE',
        entityType: 'CustomerLoyalty',
        entityId: updatedLoyalty.id,
        previousState: { pointsBalance: previousBalance },
        newState: { pointsBalance: newBalance },
      });

      return updatedLoyalty;
    });

    await this.cacheService.delete(CACHE_KEYS.CUSTOMER_LOYALTY(customerProfileId));
    await this.eventBus.publish(
      new LoyaltyPointsRedeemedEvent(
        {
          customerProfileId,
          pointsRedeemed: points,
          newBalance: updated.pointsBalance,
          referenceType,
          referenceId,
        },
        actorUserId,
      ),
    );

    return new CustomerLoyaltyEntity(updated);
  }

  public async expirePoints(customerProfileId: string, points: number, actorUserId: string = 'SYSTEM') {
    const loyalty = await this.loyaltyRepo.findByCustomer(customerProfileId);
    if (!loyalty) {
      throw new ResourceNotFoundException(ERROR_CODES.USER.NOT_FOUND, 'Customer loyalty account not found');
    }

    const pointsToExpire = Math.min(loyalty.pointsBalance, points);
    if (pointsToExpire <= 0) return new CustomerLoyaltyEntity(loyalty);

    const updated = await this.transactionService.run(async (tx) => {
      const previousBalance = loyalty.pointsBalance;
      const newBalance = previousBalance - pointsToExpire;

      const updatedLoyalty = await this.loyaltyRepo.update(
        customerProfileId,
        newBalance,
        loyalty.lifetimePointsEarned,
        loyalty.currentTier,
        loyalty.version,
        tx,
      );

      await this.ledgerRepo.create(
        customerProfileId,
        LoyaltyTransactionType.EXPIRED,
        pointsToExpire,
        previousBalance,
        newBalance,
        actorUserId,
        'EXPIRATION_JOB',
        undefined,
        `Expired ${pointsToExpire} points`,
        tx,
      );

      return updatedLoyalty;
    });

    await this.cacheService.delete(CACHE_KEYS.CUSTOMER_LOYALTY(customerProfileId));
    return new CustomerLoyaltyEntity(updated);
  }

  public async adjustPoints(customerProfileId: string, pointsDelta: number, reason: string, actorUserId: string) {
    if (pointsDelta > 0) {
      return this.earnPoints(customerProfileId, pointsDelta, 'MANUAL_ADJUSTMENT', undefined, actorUserId);
    } else if (pointsDelta < 0) {
      return this.redeemPoints(customerProfileId, Math.abs(pointsDelta), 'MANUAL_ADJUSTMENT', undefined, actorUserId);
    }
    const loyalty = await this.loyaltyRepo.findByCustomer(customerProfileId);
    return loyalty ? new CustomerLoyaltyEntity(loyalty) : null;
  }

  public async getLedger(customerProfileId: string): Promise<LoyaltyLedgerEntity[]> {
    const entries = await this.ledgerRepo.findByCustomer(customerProfileId);
    return entries.map((e) => new LoyaltyLedgerEntity(e));
  }

  private calculateTier(lifetimePoints: number): string {
    if (lifetimePoints >= 5000) return 'PLATINUM';
    if (lifetimePoints >= 1500) return 'GOLD';
    return 'SILVER';
  }
}
