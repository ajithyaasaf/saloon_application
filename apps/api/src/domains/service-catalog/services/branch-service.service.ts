import { Injectable, Logger } from '@nestjs/common';
import { BranchService, ServiceStatus } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../../../shared/cache/constants/cache-keys.constant';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { BranchRepository } from '../../salon/repositories/branch.repository';
import { CreateBranchServiceDto } from '../dto/create-branch-service.dto';
import { UpdateBranchServiceDto } from '../dto/update-branch-service.dto';
import { BranchServiceCreatedEvent } from '../events/branch-service-created.event';
import { BranchServiceDeletedEvent } from '../events/branch-service-deleted.event';
import { BranchServicePriceUpdatedEvent } from '../events/branch-service-price-updated.event';
import { BranchServiceUpdatedEvent } from '../events/branch-service-updated.event';
import { BranchServiceRepository } from '../repositories/branch-service.repository';
import { ServiceRepository } from '../repositories/service.repository';

const SYSTEM_ACTOR_UUID = '00000000-0000-0000-0000-000000000000';

/**
 * BranchServiceService — Domain business logic for branch service offerings and prices.
 *
 * Architecture ref: Phase 11.0 & Phase 11.3
 */
@Injectable()
export class BranchServiceService {
  private readonly logger = new Logger(BranchServiceService.name);

  constructor(
    private readonly branchServiceRepository: BranchServiceRepository,
    private readonly serviceRepository: ServiceRepository,
    private readonly branchRepository: BranchRepository,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBusService: EventBusService,
  ) {}

  public async assignServiceToBranch(dto: CreateBranchServiceDto, actorId?: string): Promise<BranchService> {
    if (dto.price < 0) throw new ValidationException('Price must be greater than or equal to 0.00');
    if (dto.durationMinutes <= 0 || dto.durationMinutes > 1440) {
      throw new ValidationException('Duration must be between 1 and 1440 minutes');
    }

    const branch = await this.branchRepository.findById(dto.branchId);
    if (!branch) {
      throw new ResourceNotFoundException(ERROR_CODES.BRANCH.NOT_FOUND, `Branch with ID ${dto.branchId} not found`);
    }

    const service = await this.serviceRepository.findById(dto.serviceId);
    if (!service) {
      throw new ResourceNotFoundException(ERROR_CODES.SERVICE.NOT_FOUND, `Service with ID ${dto.serviceId} not found`);
    }

    const existingAssignment = await this.branchServiceRepository.findBranchService(dto.branchId, dto.serviceId);
    if (existingAssignment) {
      throw new ValidationException(
        `Service '${service.name}' is already assigned to branch '${branch.branchName}'`,
      );
    }

    const status = dto.status ?? ServiceStatus.ACTIVE;
    const isActiveFlag = status === ServiceStatus.ACTIVE ? (dto.isActive ?? true) : false;

    const created = await this.transactionService.run(async (tx) => {
      const branchService = await this.branchServiceRepository.create(
        {
          branchId: dto.branchId,
          serviceId: dto.serviceId,
          price: dto.price,
          durationMinutes: dto.durationMinutes,
          status,
          isActive: isActiveFlag,
        },
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        action: 'BRANCH_SERVICE_CREATED',
        entityType: 'BranchService',
        entityId: branchService.id,
        actorId,
        newState: {
          branchId: branchService.branchId,
          serviceId: branchService.serviceId,
          price: Number(branchService.price),
          status: branchService.status,
        },
      });

      return branchService;
    });

    await this.cacheService.delete(CACHE_KEYS.BRANCH_SERVICES(created.branchId));
    await this.eventBusService.publish(
      new BranchServiceCreatedEvent(created.id, created.branchId, created.serviceId, Number(created.price)),
    );

    return created;
  }

  public async updateBranchService(
    id: string,
    dto: UpdateBranchServiceDto,
    actorId?: string,
  ): Promise<BranchService> {
    const existing = await this.branchServiceRepository.findById(id);
    if (!existing) {
      throw new ResourceNotFoundException(ERROR_CODES.SERVICE.NOT_FOUND, `BranchService with ID ${id} not found`);
    }

    if (dto.price !== undefined && dto.price < 0) {
      throw new ValidationException('Price must be greater than or equal to 0.00');
    }
    if (dto.durationMinutes !== undefined && (dto.durationMinutes <= 0 || dto.durationMinutes > 1440)) {
      throw new ValidationException('Duration must be between 1 and 1440 minutes');
    }

    const nextStatus = dto.status ?? existing.status;
    let nextIsActive = dto.isActive ?? existing.isActive;
    if (nextStatus === ServiceStatus.ACTIVE) {
      if (dto.isActive === false) {
        throw new ValidationException('Cannot set isActive=false while status is ACTIVE');
      }
      nextIsActive = true;
    } else {
      nextIsActive = false;
    }

    const updated = await this.transactionService.run(async (tx) => {
      const branchService = await this.branchServiceRepository.update(
        id,
        dto.version,
        {
          ...(dto.price !== undefined ? { price: dto.price } : {}),
          ...(dto.durationMinutes !== undefined ? { durationMinutes: dto.durationMinutes } : {}),
          ...(dto.status ? { status: dto.status } : {}),
          isActive: nextIsActive,
        },
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        action: 'BRANCH_SERVICE_UPDATED',
        entityType: 'BranchService',
        entityId: branchService.id,
        actorId,
        previousState: { price: Number(existing.price), status: existing.status },
        newState: { price: Number(branchService.price), status: branchService.status },
        entityVersion: branchService.version,
      });

      return branchService;
    });

    await this.cacheService.delete(CACHE_KEYS.BRANCH_SERVICES(updated.branchId));
    await this.eventBusService.publish(new BranchServiceUpdatedEvent(updated.id, updated.branchId));

    return updated;
  }

  public async changePrice(
    id: string,
    expectedVersion: number,
    newPrice: number,
    actorId?: string,
  ): Promise<BranchService> {
    if (newPrice < 0) throw new ValidationException('Price must be greater than or equal to 0.00');

    const existing = await this.branchServiceRepository.findById(id);
    if (!existing) {
      throw new ResourceNotFoundException(ERROR_CODES.SERVICE.NOT_FOUND, `BranchService with ID ${id} not found`);
    }

    const oldPriceNum = Number(existing.price);

    const updated = await this.transactionService.run(async (tx) => {
      const branchService = await this.branchServiceRepository.updatePrice(id, expectedVersion, newPrice, tx);

      await tx.branchServicePriceHistory.create({
        data: {
          branchServiceId: id,
          oldPrice: existing.price,
          newPrice,
          changedById: actorId ?? SYSTEM_ACTOR_UUID,
        },
      });

      await this.auditService.logInTransaction(tx, {
        action: 'BRANCH_SERVICE_PRICE_UPDATED',
        entityType: 'BranchService',
        entityId: id,
        actorId,
        previousState: { price: oldPriceNum },
        newState: { price: newPrice },
        entityVersion: branchService.version,
      });

      return branchService;
    });

    await this.cacheService.delete(CACHE_KEYS.BRANCH_SERVICES(updated.branchId));
    await this.eventBusService.publish(
      new BranchServicePriceUpdatedEvent(updated.id, updated.branchId, oldPriceNum, newPrice),
    );

    return updated;
  }

  public async removeBranchService(id: string, version: number, actorId?: string): Promise<void> {
    const existing = await this.branchServiceRepository.findById(id);
    if (!existing) {
      throw new ResourceNotFoundException(ERROR_CODES.SERVICE.NOT_FOUND, `BranchService with ID ${id} not found`);
    }

    await this.transactionService.run(async (tx) => {
      await this.branchServiceRepository.softDelete(id, version, tx);

      await this.auditService.logInTransaction(tx, {
        action: 'BRANCH_SERVICE_DELETED',
        entityType: 'BranchService',
        entityId: id,
        actorId,
        previousState: { branchId: existing.branchId, serviceId: existing.serviceId },
      });
    });

    await this.cacheService.delete(CACHE_KEYS.BRANCH_SERVICES(existing.branchId));
    await this.eventBusService.publish(new BranchServiceDeletedEvent(id, existing.branchId));
  }

  public async getBranchService(id: string): Promise<BranchService> {
    const branchService = await this.branchServiceRepository.findById(id);
    if (!branchService) {
      throw new ResourceNotFoundException(ERROR_CODES.SERVICE.NOT_FOUND, `BranchService with ID ${id} not found`);
    }
    return branchService;
  }

  public async listBranchServices(branchId: string): Promise<BranchService[]> {
    return this.cacheService.getOrSet(
      CACHE_KEYS.BRANCH_SERVICES(branchId),
      async () => this.branchServiceRepository.listActive(branchId),
      CACHE_TTL.BRANCH_SERVICES,
    );
  }
}
