import { Injectable, Logger } from '@nestjs/common';
import { BlacklistType, CustomerStatus } from '@prisma/client';
import { CACHE_KEYS, CACHE_TTL } from '../../../common/constants/cache-keys.constant';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { PaginationMeta } from '../../../common/types/pagination.type';
import { PaginationUtil } from '../../../common/utils/pagination.util';
import { SecurityUtil } from '../../../common/utils/security.util';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { NotificationService } from '../../../shared/notification/notification.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { CreateCustomerProfileDto, UpdateCustomerProfileDto } from '../dto/customer-profile.dto';
import { SearchCustomerQueryDto } from '../dto/search-customer-query.dto';
import { CustomerProfileEntity } from '../entities/customer-profile.entity';
import {
  CustomerArchivedEvent,
  CustomerBlockedEvent,
  CustomerCreatedEvent,
  CustomerUnblockedEvent,
  CustomerUpdatedEvent,
} from '../events/customer-events.event';
import { CustomerProfileRepository } from '../repositories/customer-profile.repository';

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(
    private readonly customerRepo: CustomerProfileRepository,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBus: EventBusService,
    private readonly notificationService: NotificationService,
  ) {}

  public async createCustomer(dto: CreateCustomerProfileDto, actorUserId: string): Promise<CustomerProfileEntity> {
    const existing = await this.customerRepo.findByPhone(dto.salonId, dto.phone);
    if (existing) {
      throw new ConflictException(ERROR_CODES.CRM.CUSTOMER_EXISTS, `Customer with phone ${dto.phone} already exists in salon`);
    }

    const customerCode = `CUST-${dto.salonId.slice(-4).toUpperCase()}-${SecurityUtil.generateRandomToken(4).toUpperCase()}`;

    const created = await this.transactionService.run(async (tx) => {
      const profile = await this.customerRepo.create(dto, customerCode, actorUserId, tx);
      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'SALON_OWNER',
        action: 'CREATE',
        entityType: 'CustomerProfile',
        entityId: profile.id,
        newState: profile as any,
      });
      return profile;
    });

    await this.cacheService.delete(CACHE_KEYS.CUSTOMER_PROFILE(created.id));
    await this.eventBus.publish(
      new CustomerCreatedEvent(
        {
          customerProfileId: created.id,
          salonId: created.salonId,
          primaryBranchId: created.primaryBranchId,
          customerCode: created.customerCode,
          phone: created.phone,
        },
        actorUserId,
      ),
    );

    return new CustomerProfileEntity(created);
  }

  public async updateCustomer(id: string, dto: UpdateCustomerProfileDto, actorUserId: string): Promise<CustomerProfileEntity> {
    const existing = await this.customerRepo.findById(id);
    if (!existing) {
      throw new ResourceNotFoundException(ERROR_CODES.USER.NOT_FOUND, 'Customer profile not found');
    }

    const updated = await this.transactionService.run(async (tx) => {
      const profile = await this.customerRepo.update(id, dto, actorUserId, tx);
      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'SALON_OWNER',
        action: 'UPDATE',
        entityType: 'CustomerProfile',
        entityId: id,
        previousState: existing as any,
        newState: profile as any,
      });
      return profile;
    });

    await this.cacheService.delete(CACHE_KEYS.CUSTOMER_PROFILE(id));
    await this.eventBus.publish(
      new CustomerUpdatedEvent(
        {
          customerProfileId: id,
          salonId: updated.salonId,
          updatedFields: Object.keys(dto),
        },
        actorUserId,
      ),
    );

    return new CustomerProfileEntity(updated);
  }

  public async blockCustomer(id: string, blacklistType: BlacklistType, reason: string, actorUserId: string): Promise<CustomerProfileEntity> {
    const existing = await this.customerRepo.findById(id);
    if (!existing) {
      throw new ResourceNotFoundException(ERROR_CODES.USER.NOT_FOUND, 'Customer profile not found');
    }

    const updated = await this.transactionService.run(async (tx) => {
      const profile = await this.customerRepo.update(
        id,
        {
          version: existing.version,
          status: CustomerStatus.BLOCKED,
          isBlacklisted: true,
          blacklistType,
          blacklistReason: reason,
        },
        actorUserId,
        tx,
      );
      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'SALON_OWNER',
        action: 'UPDATE',
        entityType: 'CustomerProfile',
        entityId: id,
        previousState: { status: existing.status, isBlacklisted: existing.isBlacklisted },
        newState: { status: profile.status, isBlacklisted: profile.isBlacklisted, reason },
      });
      return profile;
    });

    await this.cacheService.delete(CACHE_KEYS.CUSTOMER_PROFILE(id));
    await this.eventBus.publish(
      new CustomerBlockedEvent(
        {
          customerProfileId: id,
          salonId: updated.salonId,
          blacklistType,
          reason,
        },
        actorUserId,
      ),
    );

    return new CustomerProfileEntity(updated);
  }

  public async unblockCustomer(id: string, actorUserId: string): Promise<CustomerProfileEntity> {
    const existing = await this.customerRepo.findById(id);
    if (!existing) {
      throw new ResourceNotFoundException(ERROR_CODES.USER.NOT_FOUND, 'Customer profile not found');
    }

    const updated = await this.transactionService.run(async (tx) => {
      const profile = await this.customerRepo.update(
        id,
        {
          version: existing.version,
          status: CustomerStatus.ACTIVE,
          isBlacklisted: false,
        },
        actorUserId,
        tx,
      );
      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'SALON_OWNER',
        action: 'UPDATE',
        entityType: 'CustomerProfile',
        entityId: id,
        previousState: { status: existing.status },
        newState: { status: profile.status },
      });
      return profile;
    });

    await this.cacheService.delete(CACHE_KEYS.CUSTOMER_PROFILE(id));
    await this.eventBus.publish(
      new CustomerUnblockedEvent(
        {
          customerProfileId: id,
          salonId: updated.salonId,
        },
        actorUserId,
      ),
    );

    return new CustomerProfileEntity(updated);
  }

  public async archiveCustomer(id: string, actorUserId: string): Promise<CustomerProfileEntity> {
    const existing = await this.customerRepo.findById(id);
    if (!existing) {
      throw new ResourceNotFoundException(ERROR_CODES.USER.NOT_FOUND, 'Customer profile not found');
    }

    const updated = await this.transactionService.run(async (tx) => {
      const profile = await this.customerRepo.update(
        id,
        {
          version: existing.version,
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
        entityId: id,
        previousState: { status: existing.status },
        newState: { status: profile.status },
      });
      return profile;
    });

    await this.cacheService.delete(CACHE_KEYS.CUSTOMER_PROFILE(id));
    await this.eventBus.publish(
      new CustomerArchivedEvent(
        {
          customerProfileId: id,
          salonId: updated.salonId,
        },
        actorUserId,
      ),
    );

    return new CustomerProfileEntity(updated);
  }

  public async restoreCustomer(id: string, actorUserId: string): Promise<CustomerProfileEntity> {
    return this.unblockCustomer(id, actorUserId);
  }

  public async getCustomer(id: string): Promise<CustomerProfileEntity> {
    const cacheKey = CACHE_KEYS.CUSTOMER_PROFILE(id);
    const cached = await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const profile = await this.customerRepo.findById(id);
        if (!profile) {
          throw new ResourceNotFoundException(ERROR_CODES.USER.NOT_FOUND, 'Customer profile not found');
        }
        return profile;
      },
      CACHE_TTL.CUSTOMER_PROFILE,
    );

    return new CustomerProfileEntity(cached);
  }

  public async searchCustomers(query: SearchCustomerQueryDto): Promise<{ data: CustomerProfileEntity[]; meta: PaginationMeta }> {
    const normParams = PaginationUtil.normalizeParams(query.page, query.limit);
    const { data, total } = await this.customerRepo.search({
      ...query,
      page: normParams.page,
      limit: normParams.limit,
    });

    const meta = PaginationUtil.buildMeta(total, normParams);
    return {
      data: data.map((item) => new CustomerProfileEntity(item)),
      meta,
    };
  }
}
