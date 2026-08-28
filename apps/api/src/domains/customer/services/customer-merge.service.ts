import { Injectable, Logger } from '@nestjs/common';
import { CustomerStatus } from '@prisma/client';
import { CACHE_KEYS } from '../../../common/constants/cache-keys.constant';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { CustomerMergeHistoryEntity } from '../entities/customer-history.entity';
import { CustomerMergedEvent } from '../events/customer-events.event';
import { CustomerLoyaltyRepository } from '../repositories/customer-loyalty.repository';
import { CustomerMergeHistoryRepository } from '../repositories/customer-merge-history.repository';
import { CustomerProfileRepository } from '../repositories/customer-profile.repository';
import { CustomerLoyaltyService } from './customer-loyalty.service';
import { CustomerWalletService } from './customer-wallet.service';

@Injectable()
export class CustomerMergeService {
  private readonly logger = new Logger(CustomerMergeService.name);

  constructor(
    private readonly customerRepo: CustomerProfileRepository,
    private readonly mergeRepo: CustomerMergeHistoryRepository,
    private readonly loyaltyRepo: CustomerLoyaltyRepository,
    private readonly walletService: CustomerWalletService,
    private readonly loyaltyService: CustomerLoyaltyService,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBus: EventBusService,
  ) {}

  public async mergeCustomers(
    sourceCustomerProfileId: string,
    targetCustomerProfileId: string,
    mergeReason: string,
    actorUserId: string,
  ): Promise<CustomerMergeHistoryEntity> {
    if (sourceCustomerProfileId === targetCustomerProfileId) {
      throw new ValidationException('Source and target customer profiles cannot be identical');
    }

    const source = await this.customerRepo.findById(sourceCustomerProfileId);
    if (!source) {
      throw new ResourceNotFoundException(ERROR_CODES.USER.NOT_FOUND, 'Source customer profile not found');
    }

    const target = await this.customerRepo.findById(targetCustomerProfileId);
    if (!target) {
      throw new ResourceNotFoundException(ERROR_CODES.USER.NOT_FOUND, 'Target customer profile not found');
    }

    if (source.salonId !== target.salonId) {
      throw new ValidationException('Cannot merge customer profiles across different salons');
    }

    const sourceSnapshot = JSON.parse(JSON.stringify(source));

    const mergeRecord = await this.transactionService.run(async (tx) => {
      const record = await this.mergeRepo.create(
        sourceCustomerProfileId,
        targetCustomerProfileId,
        sourceSnapshot,
        actorUserId,
        mergeReason,
        tx,
      );

      await this.customerRepo.update(
        sourceCustomerProfileId,
        {
          version: source.version,
          status: CustomerStatus.ARCHIVED,
        },
        actorUserId,
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'SALON_OWNER',
        action: 'UPDATE',
        entityType: 'CustomerProfile',
        entityId: targetCustomerProfileId,
        previousState: { sourceId: sourceCustomerProfileId },
        newState: { mergedRecordId: record.id, reason: mergeReason },
      });

      return record;
    });

    if (source.walletBalance > 0) {
      const transferAmount = source.walletBalance;
      await this.walletService.debit(sourceCustomerProfileId, transferAmount, 'MERGE_TRANSFER', targetCustomerProfileId, `Wallet balance merged to target customer`, actorUserId);
      await this.walletService.credit(targetCustomerProfileId, transferAmount, 'MERGE_TRANSFER', sourceCustomerProfileId, `Wallet balance merged from source customer`, actorUserId);
    }

    const sourceLoyalty = await this.loyaltyRepo.findByCustomer(sourceCustomerProfileId);
    if (sourceLoyalty && sourceLoyalty.pointsBalance > 0) {
      const pointsToTransfer = sourceLoyalty.pointsBalance;
      await this.loyaltyService.redeemPoints(sourceCustomerProfileId, pointsToTransfer, 'MERGE_TRANSFER', targetCustomerProfileId, actorUserId);
      await this.loyaltyService.earnPoints(targetCustomerProfileId, pointsToTransfer, 'MERGE_TRANSFER', sourceCustomerProfileId, actorUserId);
    }

    await Promise.all([
      this.cacheService.delete(CACHE_KEYS.CUSTOMER_PROFILE(sourceCustomerProfileId)),
      this.cacheService.delete(CACHE_KEYS.CUSTOMER_PROFILE(targetCustomerProfileId)),
      this.cacheService.delete(CACHE_KEYS.CUSTOMER_LOYALTY(sourceCustomerProfileId)),
      this.cacheService.delete(CACHE_KEYS.CUSTOMER_LOYALTY(targetCustomerProfileId)),
      this.cacheService.delete(CACHE_KEYS.CUSTOMER_WALLET(sourceCustomerProfileId)),
      this.cacheService.delete(CACHE_KEYS.CUSTOMER_WALLET(targetCustomerProfileId)),
    ]);

    await this.eventBus.publish(
      new CustomerMergedEvent(
        {
          sourceCustomerProfileId,
          targetCustomerProfileId,
        },
        actorUserId,
      ),
    );

    return new CustomerMergeHistoryEntity(mergeRecord);
  }
}
