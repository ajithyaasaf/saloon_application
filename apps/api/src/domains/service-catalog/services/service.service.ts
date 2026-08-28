import { Injectable, Logger } from '@nestjs/common';
import { Service } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { PaginationMeta } from '../../../common/types/pagination.type';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../../../shared/cache/constants/cache-keys.constant';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { CreateServiceDto } from '../dto/create-service.dto';
import { SearchServiceQueryDto } from '../dto/search-service-query.dto';
import { UpdateServiceDto } from '../dto/update-service.dto';
import { ServiceCreatedEvent } from '../events/service-created.event';
import { ServiceDeletedEvent } from '../events/service-deleted.event';
import { ServiceUpdatedEvent } from '../events/service-updated.event';
import { ServiceCategoryRepository } from '../repositories/service-category.repository';
import { ServiceRepository } from '../repositories/service.repository';

/**
 * ServiceService — Domain business logic for master service definitions.
 *
 * Architecture ref: Phase 11.0 & Phase 11.3
 */
@Injectable()
export class ServiceService {
  private readonly logger = new Logger(ServiceService.name);

  constructor(
    private readonly serviceRepository: ServiceRepository,
    private readonly categoryRepository: ServiceCategoryRepository,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBusService: EventBusService,
  ) {}

  public async createService(dto: CreateServiceDto, actorId?: string): Promise<Service> {
    if (!dto.categoryId) throw new ValidationException('categoryId is required');
    if (!dto.name) throw new ValidationException('Service name is required');

    const category = await this.categoryRepository.findById(dto.categoryId);
    if (!category) {
      throw new ResourceNotFoundException(ERROR_CODES.SERVICE.NOT_FOUND, `ServiceCategory with ID ${dto.categoryId} not found`);
    }

    const categoryServices = await this.serviceRepository.findByCategory(dto.categoryId);
    const duplicate = categoryServices.find((s) => s.name.toLowerCase() === dto.name.toLowerCase());
    if (duplicate) {
      throw new ValidationException(`Service with name '${dto.name}' already exists in category '${category.name}'`);
    }

    const created = await this.transactionService.run(async (tx) => {
      const service = await this.serviceRepository.create(
        {
          categoryId: dto.categoryId,
          name: dto.name,
          description: dto.description ?? null,
          genderCategory: dto.genderCategory ?? 'UNISEX',
          coverMediaId: dto.coverMediaId ?? null,
        },
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        action: 'SERVICE_CREATED',
        entityType: 'Service',
        entityId: service.id,
        actorId,
        newState: { categoryId: service.categoryId, name: service.name, genderCategory: service.genderCategory },
      });

      return service;
    });

    await this.cacheService.delete(CACHE_KEYS.SERVICE_CATEGORIES());
    await this.eventBusService.publish(new ServiceCreatedEvent(created.id, created.categoryId, created.name));

    return created;
  }

  public async updateService(id: string, dto: UpdateServiceDto, actorId?: string): Promise<Service> {
    const existing = await this.serviceRepository.findById(id);
    if (!existing) {
      throw new ResourceNotFoundException(ERROR_CODES.SERVICE.NOT_FOUND, `Service with ID ${id} not found`);
    }

    if (dto.categoryId && dto.categoryId !== existing.categoryId) {
      const category = await this.categoryRepository.findById(dto.categoryId);
      if (!category) {
        throw new ResourceNotFoundException(ERROR_CODES.SERVICE.NOT_FOUND, `ServiceCategory with ID ${dto.categoryId} not found`);
      }
    }

    const targetCategoryId = dto.categoryId ?? existing.categoryId;
    if (dto.name && dto.name.toLowerCase() !== existing.name.toLowerCase()) {
      const categoryServices = (await this.serviceRepository.findByCategory(targetCategoryId)) ?? [];
      const duplicate = categoryServices.find((s) => s.id !== id && s.name.toLowerCase() === dto.name!.toLowerCase());
      if (duplicate) {
        throw new ValidationException(`Service with name '${dto.name}' already exists in category`);
      }
    }

    const updated = await this.transactionService.run(async (tx) => {
      const service = await this.serviceRepository.update(
        id,
        dto.version,
        {
          ...(dto.categoryId ? { categoryId: dto.categoryId } : {}),
          ...(dto.name ? { name: dto.name } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.genderCategory ? { genderCategory: dto.genderCategory } : {}),
          ...(dto.coverMediaId !== undefined ? { coverMediaId: dto.coverMediaId } : {}),
        },
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        action: 'SERVICE_UPDATED',
        entityType: 'Service',
        entityId: service.id,
        actorId,
        previousState: { name: existing.name, categoryId: existing.categoryId },
        newState: { name: service.name, categoryId: service.categoryId },
        entityVersion: service.version,
      });

      return service;
    });

    await this.cacheService.delete(CACHE_KEYS.SERVICE_DETAILS(id));
    await this.cacheService.delete(CACHE_KEYS.SERVICE_CATEGORIES());
    await this.eventBusService.publish(new ServiceUpdatedEvent(updated.id));

    return updated;
  }

  public async deleteService(id: string, version: number, actorId?: string): Promise<void> {
    const existing = await this.serviceRepository.findById(id);
    if (!existing) {
      throw new ResourceNotFoundException(ERROR_CODES.SERVICE.NOT_FOUND, `Service with ID ${id} not found`);
    }

    await this.transactionService.run(async (tx) => {
      await this.serviceRepository.softDelete(id, version, tx);

      await this.auditService.logInTransaction(tx, {
        action: 'SERVICE_DELETED',
        entityType: 'Service',
        entityId: id,
        actorId,
        previousState: { name: existing.name },
      });
    });

    await this.cacheService.delete(CACHE_KEYS.SERVICE_DETAILS(id));
    await this.eventBusService.publish(new ServiceDeletedEvent(id));
  }

  public async getService(id: string): Promise<Service> {
    return this.cacheService.getOrSet(
      CACHE_KEYS.SERVICE_DETAILS(id),
      async () => {
        const service = await this.serviceRepository.findById(id);
        if (!service) {
          throw new ResourceNotFoundException(ERROR_CODES.SERVICE.NOT_FOUND, `Service with ID ${id} not found`);
        }
        return service;
      },
      CACHE_TTL.SERVICE_DETAILS,
    );
  }

  public async listServices(): Promise<Service[]> {
    return this.serviceRepository.findAll();
  }

  public async searchServices(query: SearchServiceQueryDto): Promise<{ data: Service[]; meta: PaginationMeta }> {
    return this.serviceRepository.search(query);
  }
}
