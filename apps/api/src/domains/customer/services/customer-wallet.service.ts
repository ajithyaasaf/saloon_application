import { Injectable, Logger } from '@nestjs/common';
import { WalletTransactionType } from '@prisma/client';
import { CACHE_KEYS } from '../../../common/constants/cache-keys.constant';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { CustomerWalletLedgerEntity } from '../entities/customer-wallet.entity';
import { WalletCreditEvent, WalletDebitEvent } from '../events/customer-events.event';
import { CustomerProfileRepository } from '../repositories/customer-profile.repository';
import { CustomerWalletLedgerRepository } from '../repositories/customer-wallet-ledger.repository';

@Injectable()
export class CustomerWalletService {
  private readonly logger = new Logger(CustomerWalletService.name);

  constructor(
    private readonly walletLedgerRepo: CustomerWalletLedgerRepository,
    private readonly customerRepo: CustomerProfileRepository,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBus: EventBusService,
  ) {}

  public async credit(
    customerProfileId: string,
    amount: number,
    referenceType?: string,
    referenceId?: string,
    description?: string,
    actorUserId: string = 'SYSTEM',
  ): Promise<CustomerWalletLedgerEntity> {
    if (amount <= 0) {
      throw new ValidationException('Credit amount must be positive');
    }

    const customer = await this.customerRepo.findById(customerProfileId);
    if (!customer) {
      throw new ResourceNotFoundException(ERROR_CODES.USER.NOT_FOUND, 'Customer profile not found');
    }

    const previousBalance = customer.walletBalance;
    const newBalance = previousBalance + amount;

    const ledger = await this.transactionService.run(async (tx) => {
      await this.customerRepo.update(customerProfileId, { version: customer.version }, actorUserId, tx);

      const entry = await this.walletLedgerRepo.create(
        customerProfileId,
        WalletTransactionType.CREDIT,
        amount,
        previousBalance,
        newBalance,
        actorUserId,
        referenceType,
        referenceId,
        description ?? `Wallet credit of ${amount}`,
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'SALON_OWNER',
        action: 'CREATE',
        entityType: 'CustomerWalletLedger',
        entityId: entry.id,
        newState: { customerProfileId, amount, previousBalance, newBalance },
      });

      return entry;
    });

    await this.cacheService.delete(CACHE_KEYS.CUSTOMER_WALLET(customerProfileId));
    await this.cacheService.delete(CACHE_KEYS.CUSTOMER_PROFILE(customerProfileId));
    await this.eventBus.publish(
      new WalletCreditEvent(
        {
          customerProfileId,
          amount,
          newBalance,
          referenceType,
          referenceId,
        },
        actorUserId,
      ),
    );

    return new CustomerWalletLedgerEntity(ledger);
  }

  public async debit(
    customerProfileId: string,
    amount: number,
    referenceType?: string,
    referenceId?: string,
    description?: string,
    actorUserId: string = 'SYSTEM',
  ): Promise<CustomerWalletLedgerEntity> {
    if (amount <= 0) {
      throw new ValidationException('Debit amount must be positive');
    }

    const customer = await this.customerRepo.findById(customerProfileId);
    if (!customer) {
      throw new ResourceNotFoundException(ERROR_CODES.USER.NOT_FOUND, 'Customer profile not found');
    }

    if (customer.walletBalance < amount) {
      throw new ConflictException(
        ERROR_CODES.VALIDATION.INVALID_INPUT,
        `Insufficient wallet balance. Available: ${customer.walletBalance}`,
      );
    }

    const previousBalance = customer.walletBalance;
    const newBalance = previousBalance - amount;

    const ledger = await this.transactionService.run(async (tx) => {
      await this.customerRepo.update(customerProfileId, { version: customer.version }, actorUserId, tx);

      const entry = await this.walletLedgerRepo.create(
        customerProfileId,
        WalletTransactionType.DEBIT,
        amount,
        previousBalance,
        newBalance,
        actorUserId,
        referenceType,
        referenceId,
        description ?? `Wallet debit of ${amount}`,
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'SALON_OWNER',
        action: 'CREATE',
        entityType: 'CustomerWalletLedger',
        entityId: entry.id,
        newState: { customerProfileId, amount, previousBalance, newBalance },
      });

      return entry;
    });

    await this.cacheService.delete(CACHE_KEYS.CUSTOMER_WALLET(customerProfileId));
    await this.cacheService.delete(CACHE_KEYS.CUSTOMER_PROFILE(customerProfileId));
    await this.eventBus.publish(
      new WalletDebitEvent(
        {
          customerProfileId,
          amount,
          newBalance,
          referenceType,
          referenceId,
        },
        actorUserId,
      ),
    );

    return new CustomerWalletLedgerEntity(ledger);
  }

  public async refund(customerProfileId: string, amount: number, referenceId: string, actorUserId: string): Promise<CustomerWalletLedgerEntity> {
    return this.credit(customerProfileId, amount, 'REFUND', referenceId, `Refund to wallet`, actorUserId);
  }

  public async adjust(customerProfileId: string, amountDelta: number, description: string, actorUserId: string): Promise<CustomerWalletLedgerEntity> {
    if (amountDelta > 0) {
      return this.credit(customerProfileId, amountDelta, 'MANUAL_ADJUSTMENT', undefined, description, actorUserId);
    } else {
      return this.debit(customerProfileId, Math.abs(amountDelta), 'MANUAL_ADJUSTMENT', undefined, description, actorUserId);
    }
  }

  public async getLedger(customerProfileId: string): Promise<CustomerWalletLedgerEntity[]> {
    const entries = await this.walletLedgerRepo.findByCustomer(customerProfileId);
    return entries.map((e) => new CustomerWalletLedgerEntity(e));
  }
}
