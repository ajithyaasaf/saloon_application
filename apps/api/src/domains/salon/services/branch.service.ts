import { Injectable, Logger } from '@nestjs/common';
import { Branch } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ForbiddenOperationException } from '../../../common/exceptions/forbidden-operation.exception';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { CACHE_KEYS } from '../../../shared/cache/constants/cache-keys.constant';
import { BaseDomainEvent } from '../../../shared/events/base/domain-event.base';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { CreateBranchDto } from '../dto/create-branch.dto';
import { BranchRepository } from '../repositories/branch.repository';
import { BusinessHoursRepository } from '../repositories/business-hours.repository';
import { SalonRepository } from '../repositories/salon.repository';

class BranchCreatedEvent extends BaseDomainEvent<{ branchId: string; salonId: string }> {
  constructor(branchId: string, salonId: string) {
    super('branch.created.v1', branchId, 1, { branchId, salonId });
  }
}

class BranchUpdatedEvent extends BaseDomainEvent<{ branchId: string; salonId: string }> {
  constructor(branchId: string, salonId: string) {
    super('branch.updated.v1', branchId, 1, { branchId, salonId });
  }
}

/**
 * BranchService — Manages Salon Branch lifecycle, primary branch switching, and geo queries.
 *
 * Thread Safety: 100% Thread-Safe.
 *
 * Architecture ref: Phase 10.0 & Phase 10.3
 */
@Injectable()
export class BranchService {
  private readonly logger = new Logger(BranchService.name);

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
   * Creates a new branch for a Salon with ownership verification.
   */
  public async createBranch(salonId: string, ownerId: string, dto: CreateBranchDto): Promise<Branch> {
    const salon = await this.salonRepository.findById(salonId);
    if (!salon) throw new ResourceNotFoundException(ERROR_CODES.SALON.NOT_FOUND, `Salon ${salonId} not found`);

    if (salon.ownerId !== ownerId) {
      throw new ForbiddenOperationException('You do not own this salon profile');
    }

    const createdBranch = await this.transactionService.run(async (tx) => {
      const branch = await this.branchRepository.create(
        {
          salonId,
          branchName: dto.branchName,
          isPrimary: false,
          addressLine1: dto.addressLine1,
          addressLine2: dto.addressLine2 ?? null,
          city: dto.city,
          state: dto.state,
          pincode: dto.pincode,
          latitude: dto.latitude,
          longitude: dto.longitude,
          phone: dto.phone,
          genderCategory: dto.genderCategory ?? 'UNISEX',
          coverMediaId: dto.coverMediaId ?? null,
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
        action: 'BRANCH_CREATED',
        entityType: 'Branch',
        entityId: branch.id,
        actorId: ownerId,
        actorRole: 'SALON_OWNER',
        newState: { id: branch.id, branchName: branch.branchName },
      });

      return branch;
    });

    await this.cacheService.delete(CACHE_KEYS.SALON_PROFILE(salonId));
    await this.eventBusService.publish(new BranchCreatedEvent(createdBranch.id, salonId));

    return createdBranch;
  }

  /**
   * Sets a branch as primary for a salon.
   */
  public async setPrimaryBranch(salonId: string, branchId: string, ownerId: string): Promise<void> {
    const salon = await this.salonRepository.findById(salonId);
    if (!salon) throw new ResourceNotFoundException(ERROR_CODES.SALON.NOT_FOUND, `Salon ${salonId} not found`);

    if (salon.ownerId !== ownerId) {
      throw new ForbiddenOperationException('You do not own this salon profile');
    }

    const targetBranch = await this.branchRepository.findById(branchId);
    if (!targetBranch || targetBranch.salonId !== salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.BRANCH.NOT_FOUND, `Branch ${branchId} not found for Salon ${salonId}`);
    }

    await this.transactionService.run(async (tx) => {
      await this.branchRepository.setPrimaryBranch(salonId, branchId, tx);
      await this.auditService.logInTransaction(tx, {
        action: 'PRIMARY_BRANCH_SET',
        entityType: 'Branch',
        entityId: branchId,
        actorId: ownerId,
        actorRole: 'SALON_OWNER',
        newState: { salonId, primaryBranchId: branchId },
      });
    });

    await this.cacheService.delete(CACHE_KEYS.SALON_PROFILE(salonId));
    await this.eventBusService.publish(new BranchUpdatedEvent(branchId, salonId));
  }

  /**
   * Finds nearby branches within radiusKm.
   */
  public async findNearbyBranches(lat: number, lng: number, radiusKm: number, limit = 20): Promise<Branch[]> {
    return this.branchRepository.findNearby(lat, lng, radiusKm, limit);
  }

  /**
   * Gets all branches belonging to a specific salon.
   */
  public async getBranchesBySalonId(salonId: string): Promise<Branch[]> {
    return this.branchRepository.findBySalonId(salonId);
  }

  /**
   * Gets a specific branch for a salon.
   */
  public async getBranchById(salonId: string, branchId: string): Promise<Branch> {
    const branch = await this.branchRepository.findById(branchId);
    if (!branch || branch.salonId !== salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.BRANCH.NOT_FOUND, `Branch ${branchId} not found`);
    }
    return branch;
  }
}
