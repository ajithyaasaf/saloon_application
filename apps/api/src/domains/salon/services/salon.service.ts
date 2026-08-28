import { Injectable, Logger } from '@nestjs/common';
import { Salon } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ForbiddenOperationException } from '../../../common/exceptions/forbidden-operation.exception';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { SlugUtil } from '../../../common/utils/slug.util';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../../../shared/cache/constants/cache-keys.constant';
import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { CreateSalonDto } from '../dto/create-salon.dto';
import { SearchSalonQueryDto } from '../dto/search-salon-query.dto';
import { UpdateSalonDto } from '../dto/update-salon.dto';
import { BranchRepository } from '../repositories/branch.repository';
import { BusinessHoursRepository } from '../repositories/business-hours.repository';
import { SalonRepository } from '../repositories/salon.repository';

class SalonCreatedEvent extends BaseDomainEvent<{ salonId: string; ownerId: string }> {
  constructor(salonId: string, ownerId: string) {
    super('salon.created.v1', salonId, 1, { salonId, ownerId });
  }
}

class SalonUpdatedEvent extends BaseDomainEvent<{ salonId: string }> {
  constructor(salonId: string) {
    super('salon.updated.v1', salonId, 1, { salonId });
  }
}

/**
 * SalonService — Orchestrates Salon aggregate root domain operations.
 *
 * Thread Safety: 100% Thread-Safe.
 * Transaction Boundary: All multi-repository writes run inside TransactionService interactive blocks.
 * Post-Commit Rules: Audit logs inside transaction; Cache eviction & Events executed post-commit.
 *
 * Architecture ref: Phase 10.0 & Phase 10.3
 */
@Injectable()
export class SalonService {
  private readonly logger = new Logger(SalonService.name);

  constructor(
    private readonly salonRepository: SalonRepository,
    private readonly branchRepository: BranchRepository,
    private readonly businessHoursRepository: BusinessHoursRepository,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBusService: EventBusService,
  ) {}

  /**
   * Transactionally creates Salon + Primary Branch + Default Business Hours + Audit Log.
   */
  public async createSalon(ownerId: string, dto: CreateSalonDto): Promise<Salon> {
    if (!ownerId) throw new ValidationException('ownerId is required');
    if (!dto.brandName) throw new ValidationException('brandName is required');

    const generatedSlug = SlugUtil.slugify(dto.brandName);

    const createdSalon = await this.transactionService.run(async (tx) => {
      const salon = await this.salonRepository.create(
        {
          ownerId,
          brandName: dto.brandName,
          slug: generatedSlug,
          description: dto.description ?? null,
          gstin: dto.gstin ?? null,
          planType: dto.planType ?? 'FREE_COMMISSION',
          status: 'DRAFT',
          logoMediaId: dto.logoMediaId ?? null,
        },
        tx,
      );

      const branch = await this.branchRepository.create(
        {
          salonId: salon.id,
          branchName: dto.primaryBranchName,
          isPrimary: true,
          addressLine1: dto.addressLine1,
          addressLine2: dto.addressLine2 ?? null,
          city: dto.city,
          state: dto.state,
          pincode: dto.pincode,
          latitude: dto.latitude,
          longitude: dto.longitude,
          phone: dto.phone,
          genderCategory: dto.genderCategory ?? 'UNISEX',
          status: 'APPROVED',
        },
        tx,
      );

      const defaultDays = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;
      const defaultHours = defaultDays.map((day) => ({
        branchId: branch.id,
        dayOfWeek: day,
        openTime: new Date('1970-01-01T09:00:00Z'),
        closeTime: new Date('1970-01-01T20:00:00Z'),
        isClosed: false,
      }));

      await this.businessHoursRepository.upsertHours(branch.id, defaultHours, tx);

      await this.auditService.logInTransaction(tx, {
        action: 'SALON_CREATED',
        entityType: 'Salon',
        entityId: salon.id,
        actorId: ownerId,
        actorRole: 'SALON_OWNER',
        newState: { id: salon.id, brandName: salon.brandName, status: salon.status },
      });

      return salon;
    });

    // Post-Commit Actions
    await this.eventBusService.publish(new SalonCreatedEvent(createdSalon.id, ownerId));
    return createdSalon;
  }

  /**
   * Updates an existing Salon profile (with tenant ownership validation).
   */
  public async updateSalon(
    id: string,
    ownerId: string,
    version: number,
    dto: UpdateSalonDto,
  ): Promise<Salon> {
    const existing = await this.salonRepository.findById(id);
    if (!existing) {
      throw new ResourceNotFoundException(ERROR_CODES.SALON.NOT_FOUND, `Salon ${id} not found`);
    }

    if (existing.ownerId !== ownerId) {
      throw new ForbiddenOperationException('You do not own this salon profile');
    }

    const updatedSalon = await this.transactionService.run(async (tx) => {
      const updated = await this.salonRepository.update(
        id,
        version,
        {
          ...(dto.brandName ? { brandName: dto.brandName } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.gstin !== undefined ? { gstin: dto.gstin } : {}),
          ...(dto.planType ? { planType: dto.planType } : {}),
          ...(dto.logoMediaId !== undefined ? { logoMediaId: dto.logoMediaId } : {}),
        },
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        action: 'SALON_UPDATED',
        entityType: 'Salon',
        entityId: id,
        actorId: ownerId,
        actorRole: 'SALON_OWNER',
        previousState: { brandName: existing.brandName, status: existing.status },
        newState: { brandName: updated.brandName, status: updated.status },
      });

      return updated;
    });

    // Post-Commit Invalidation & Events
    await this.cacheService.delete(CACHE_KEYS.SALON_PROFILE(id));
    await this.eventBusService.publish(new SalonUpdatedEvent(id));

    return updatedSalon;
  }

  /**
   * Retrieves a Salon profile by ID using Cache-Aside strategy.
   */
  public async getSalonById(id: string): Promise<Salon> {
    const cacheKey = CACHE_KEYS.SALON_PROFILE(id);
    const salon = await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const dbSalon = await this.salonRepository.findById(id);
        if (!dbSalon) {
          throw new ResourceNotFoundException(ERROR_CODES.SALON.NOT_FOUND, `Salon ${id} not found`);
        }
        return dbSalon;
      },
      CACHE_TTL.SALON_PROFILE,
    );

    return salon;
  }

  /**
   * Retrieves a Salon profile by Slug.
   */
  public async getSalonBySlug(slug: string): Promise<Salon> {
    const salon = await this.salonRepository.findBySlug(slug);
    if (!salon) {
      throw new ResourceNotFoundException(ERROR_CODES.SALON.NOT_FOUND, `Salon with slug "${slug}" not found`);
    }
    return salon;
  }

  /**
   * Searches and lists approved Salons.
   */
  public async searchSalons(query: SearchSalonQueryDto) {
    return this.salonRepository.findAll(query);
  }
}
