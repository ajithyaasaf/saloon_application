import { Injectable, Logger } from '@nestjs/common';
import { ServiceCategory } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../../../shared/cache/constants/cache-keys.constant';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { CategoryCreatedEvent } from '../events/category-created.event';
import { CategoryDeletedEvent } from '../events/category-deleted.event';
import { CategoryUpdatedEvent } from '../events/category-updated.event';
import { ServiceCategoryRepository } from '../repositories/service-category.repository';

/**
 * CategoryService — Domain business logic for master service categories.
 *
 * Architecture ref: Phase 11.0 & Phase 11.3
 */
@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);

  constructor(
    private readonly categoryRepository: ServiceCategoryRepository,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBusService: EventBusService,
  ) { }

  public async createCategory(dto: CreateCategoryDto, actorId?: string): Promise<ServiceCategory> {
    if (!dto.name) throw new ValidationException('Category name is required');

    const existing = await this.categoryRepository.findByName(dto.name);
    if (existing) {
      throw new ValidationException(`ServiceCategory with name '${dto.name}' already exists`);
    }

    const created = await this.transactionService.run(async (tx) => {
      const category = await this.categoryRepository.create(
        {
          name: dto.name,
          displayOrder: dto.displayOrder ?? 0,
          iconMediaId: dto.iconMediaId ?? null,
        },
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        action: 'CATEGORY_CREATED',
        entityType: 'ServiceCategory',
        entityId: category.id,
        actorId,
        newState: { name: category.name, displayOrder: category.displayOrder },
      });

      return category;
    });

    await this.cacheService.delete(CACHE_KEYS.SERVICE_CATEGORIES());
    await this.eventBusService.publish(new CategoryCreatedEvent(created.id, created.name));

    return created;
  }

  public async updateCategory(id: string, dto: UpdateCategoryDto, actorId?: string): Promise<ServiceCategory> {
    const existing = await this.categoryRepository.findById(id);
    if (!existing) {
      throw new ResourceNotFoundException(ERROR_CODES.SERVICE.NOT_FOUND, `ServiceCategory with ID ${id} not found`);
    }

    if (dto.name && dto.name.toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = await this.categoryRepository.findByName(dto.name);
      if (duplicate) {
        throw new ValidationException(`ServiceCategory with name '${dto.name}' already exists`);
      }
    }

    const updated = await this.transactionService.run(async (tx) => {
      const category = await this.categoryRepository.update(
        id,
        dto.version,
        {
          ...(dto.name ? { name: dto.name } : {}),
          ...(dto.displayOrder !== undefined ? { displayOrder: dto.displayOrder } : {}),
          ...(dto.iconMediaId !== undefined ? { iconMediaId: dto.iconMediaId } : {}),
        },
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        action: 'CATEGORY_UPDATED',
        entityType: 'ServiceCategory',
        entityId: category.id,
        actorId,
        previousState: { name: existing.name, displayOrder: existing.displayOrder },
        newState: { name: category.name, displayOrder: category.displayOrder },
        entityVersion: category.version,
      });

      return category;
    });

    await this.cacheService.delete(CACHE_KEYS.SERVICE_CATEGORIES());
    await this.eventBusService.publish(new CategoryUpdatedEvent(updated.id));

    return updated;
  }

  public async deleteCategory(id: string, version: number, actorId?: string): Promise<void> {
    const existing = await this.categoryRepository.findById(id);
    if (!existing) {
      throw new ResourceNotFoundException(ERROR_CODES.SERVICE.NOT_FOUND, `ServiceCategory with ID ${id} not found`);
    }

    await this.transactionService.run(async (tx) => {
      await this.categoryRepository.softDelete(id, version, tx);

      await this.auditService.logInTransaction(tx, {
        action: 'CATEGORY_DELETED',
        entityType: 'ServiceCategory',
        entityId: id,
        actorId,
        previousState: { name: existing.name },
      });
    });

    await this.cacheService.delete(CACHE_KEYS.SERVICE_CATEGORIES());
    await this.eventBusService.publish(new CategoryDeletedEvent(id));
  }

  public async getCategory(id: string): Promise<ServiceCategory> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new ResourceNotFoundException(ERROR_CODES.SERVICE.NOT_FOUND, `ServiceCategory with ID ${id} not found`);
    }
    return category;
  }

  public async listCategories(): Promise<ServiceCategory[]> {
    return this.cacheService.getOrSet(
      CACHE_KEYS.SERVICE_CATEGORIES(),
      async () => this.categoryRepository.findAll(),
      CACHE_TTL.SERVICE_CATEGORIES,
    );
  }
}
