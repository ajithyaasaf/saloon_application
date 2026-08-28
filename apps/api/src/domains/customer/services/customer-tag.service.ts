import { Injectable, Logger } from '@nestjs/common';
import { CACHE_KEYS } from '../../../common/constants/cache-keys.constant';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { CreateCustomerTagDto, UpdateCustomerTagDto } from '../dto/customer-tag.dto';
import { CustomerTagEntity } from '../entities/customer-profile.entity';
import { CustomerTagAssignedEvent } from '../events/customer-events.event';
import { CustomerProfileRepository } from '../repositories/customer-profile.repository';
import { CustomerTagAssignmentRepository } from '../repositories/customer-tag-assignment.repository';
import { CustomerTagRepository } from '../repositories/customer-tag.repository';

@Injectable()
export class CustomerTagService {
  private readonly logger = new Logger(CustomerTagService.name);

  constructor(
    private readonly tagRepo: CustomerTagRepository,
    private readonly assignmentRepo: CustomerTagAssignmentRepository,
    private readonly customerRepo: CustomerProfileRepository,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBus: EventBusService,
  ) {}

  public async createTag(dto: CreateCustomerTagDto, actorUserId: string): Promise<CustomerTagEntity> {
    const created = await this.transactionService.run(async (tx) => {
      const tag = await this.tagRepo.create(dto, actorUserId, tx);
      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'SALON_OWNER',
        action: 'CREATE',
        entityType: 'CustomerTag',
        entityId: tag.id,
        newState: tag as any,
      });
      return tag;
    });

    return new CustomerTagEntity(created);
  }

  public async updateTag(id: string, dto: UpdateCustomerTagDto, actorUserId: string): Promise<CustomerTagEntity> {
    const existing = await this.tagRepo.findById(id);
    if (!existing) {
      throw new ResourceNotFoundException(ERROR_CODES.DATABASE.UNHANDLED_ERROR, 'Customer tag not found');
    }

    const updated = await this.transactionService.run(async (tx) => {
      const tag = await this.tagRepo.update(id, dto, actorUserId, tx);
      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'SALON_OWNER',
        action: 'UPDATE',
        entityType: 'CustomerTag',
        entityId: id,
        previousState: existing as any,
        newState: tag as any,
      });
      return tag;
    });

    return new CustomerTagEntity(updated);
  }

  public async assignTag(customerProfileId: string, tagId: string, actorUserId: string) {
    const customer = await this.customerRepo.findById(customerProfileId);
    if (!customer) {
      throw new ResourceNotFoundException(ERROR_CODES.USER.NOT_FOUND, 'Customer profile not found');
    }

    const tag = await this.tagRepo.findById(tagId);
    if (!tag) {
      throw new ResourceNotFoundException(ERROR_CODES.DATABASE.UNHANDLED_ERROR, 'Customer tag not found');
    }

    const assignment = await this.transactionService.run(async (tx) => {
      const result = await this.assignmentRepo.assign(customerProfileId, tagId, actorUserId, tx);
      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'SALON_OWNER',
        action: 'CREATE',
        entityType: 'CustomerTagAssignment',
        entityId: `${customerProfileId}:${tagId}`,
        newState: { customerProfileId, tagId },
      });
      return result;
    });

    await this.cacheService.delete(CACHE_KEYS.CUSTOMER_PROFILE(customerProfileId));
    await this.eventBus.publish(
      new CustomerTagAssignedEvent(
        {
          customerProfileId,
          tagId,
          tagName: tag.name,
        },
        actorUserId,
      ),
    );

    return assignment;
  }

  public async removeTag(customerProfileId: string, tagId: string, actorUserId: string) {
    const result = await this.transactionService.run(async (tx) => {
      const removed = await this.assignmentRepo.remove(customerProfileId, tagId, tx);
      if (removed) {
        await this.auditService.logInTransaction(tx, {
          actorId: actorUserId,
          actorRole: 'SALON_OWNER',
          action: 'DELETE',
          entityType: 'CustomerTagAssignment',
          entityId: `${customerProfileId}:${tagId}`,
        });
      }
      return removed;
    });

    await this.cacheService.delete(CACHE_KEYS.CUSTOMER_PROFILE(customerProfileId));
    return result;
  }
}
