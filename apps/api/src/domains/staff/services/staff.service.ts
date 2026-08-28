import { Injectable, Logger } from '@nestjs/common';
import { EmploymentStatus, Staff } from '@prisma/client';
import { CACHE_KEYS, CACHE_TTL } from '../../../common/constants/cache-keys.constant';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { PaginationMeta } from '../../../common/types/pagination.type';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { CreateStaffDto } from '../dto/create-staff.dto';
import { SearchStaffQueryDto } from '../dto/search-staff-query.dto';
import { UpdateStaffDto } from '../dto/update-staff.dto';
import { StaffEntity } from '../entities/staff.entity';
import { StaffActivatedEvent } from '../events/staff-activated.event';
import { StaffCreatedEvent } from '../events/staff-created.event';
import { StaffTerminatedEvent } from '../events/staff-terminated.event';
import { StaffUpdatedEvent } from '../events/staff-updated.event';
import { StaffRepository } from '../repositories/staff.repository';

/**
 * StaffService — Domain business logic for staff member management.
 *
 * Architecture ref: Phase 12.0 & Phase 12.3
 */
@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);

  constructor(
    private readonly staffRepository: StaffRepository,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBusService: EventBusService,
  ) {}

  public async createStaff(dto: CreateStaffDto, actorId?: string): Promise<Staff> {
    if (!dto.salonId) throw new ValidationException('Salon ID is required');
    if (!dto.displayName) throw new ValidationException('Display name is required');
    if (!dto.role) throw new ValidationException('Role is required');

    let code = dto.employeeCode;
    if (!code) {
      const count = await this.staffRepository.countBySalon(dto.salonId);
      code = `EMP${String(count + 1).padStart(3, '0')}`;
    }

    const existingCode = await this.staffRepository.findByEmployeeCode(dto.salonId, code);
    if (existingCode) {
      throw new ConflictException(
        ERROR_CODES.DATABASE.UNIQUE_VIOLATION,
        `Employee code '${code}' already exists in salon ${dto.salonId}`,
      );
    }

    const created = await this.transactionService.run(async (tx) => {
      const staff = await this.staffRepository.create(
        {
          salonId: dto.salonId,
          employeeCode: code,
          displayName: dto.displayName,
          role: dto.role,
          customRoleId: dto.customRoleId ?? null,
          bio: dto.bio ?? null,
          avatarMediaId: dto.avatarMediaId ?? null,
          employmentStatus: EmploymentStatus.ACTIVE,
          joinedAt: dto.joinedAt ? new Date(dto.joinedAt) : new Date(),
          createdById: actorId ?? null,
          updatedById: actorId ?? null,
        },
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        action: 'STAFF_CREATED',
        entityType: 'Staff',
        entityId: staff.id,
        actorId,
        newState: { salonId: staff.salonId, employeeCode: staff.employeeCode, role: staff.role },
      });

      return staff;
    });

    await this.cacheService.delete(CACHE_KEYS.BRANCH_ROSTER(created.salonId));
    await this.eventBusService.publish(new StaffCreatedEvent(created.id, created.salonId, created.role, created.employeeCode));

    return created;
  }

  public async updateStaff(id: string, dto: UpdateStaffDto, actorId?: string): Promise<Staff> {
    const existing = await this.getStaff(id);
    const entity = new StaffEntity(existing);

    if (entity.isTerminated() || entity.isArchived()) {
      throw new ValidationException(`Cannot update staff ${id} in ${existing.employmentStatus} status`);
    }

    if (dto.employeeCode && dto.employeeCode !== existing.employeeCode) {
      const existingCode = await this.staffRepository.findByEmployeeCode(existing.salonId, dto.employeeCode);
      if (existingCode && existingCode.id !== id) {
        throw new ConflictException(
          ERROR_CODES.DATABASE.UNIQUE_VIOLATION,
          `Employee code '${dto.employeeCode}' is already in use`,
        );
      }
    }

    const updated = await this.transactionService.run(async (tx) => {
      const result = await this.staffRepository.update(
        id,
        dto.version,
        {
          displayName: dto.displayName ?? existing.displayName,
          employeeCode: dto.employeeCode ?? existing.employeeCode,
          role: dto.role ?? existing.role,
          customRoleId: dto.customRoleId !== undefined ? dto.customRoleId : existing.customRoleId,
          bio: dto.bio !== undefined ? dto.bio : existing.bio,
          avatarMediaId: dto.avatarMediaId !== undefined ? dto.avatarMediaId : existing.avatarMediaId,
          employmentStatus: dto.employmentStatus ?? existing.employmentStatus,
          joinedAt: dto.joinedAt ? new Date(dto.joinedAt) : existing.joinedAt,
          updatedById: actorId ?? null,
        },
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        action: 'STAFF_UPDATED',
        entityType: 'Staff',
        entityId: id,
        actorId,
        previousState: { displayName: existing.displayName, role: existing.role },
        newState: { displayName: result.displayName, role: result.role },
      });

      return result;
    });

    await this.cacheService.delete(CACHE_KEYS.STAFF_PROFILE(id));
    await this.cacheService.delete(CACHE_KEYS.BRANCH_ROSTER(updated.salonId));
    await this.eventBusService.publish(new StaffUpdatedEvent(updated.id, updated.salonId));

    return updated;
  }

  public async terminateStaff(id: string, expectedVersion: number, actorId?: string): Promise<Staff> {
    if (actorId && actorId === id) {
      throw new ValidationException('Owner or staff member cannot terminate themselves');
    }

    const existing = await this.getStaff(id);
    const entity = new StaffEntity(existing);

    if (entity.isTerminated()) {
      throw new ValidationException(`Staff member ${id} is already terminated`);
    }

    const terminated = await this.transactionService.run(async (tx) => {
      const now = new Date();
      const result = await this.staffRepository.update(
        id,
        expectedVersion,
        {
          employmentStatus: EmploymentStatus.TERMINATED,
          terminatedAt: now,
          updatedById: actorId ?? null,
        },
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        action: 'STAFF_TERMINATED',
        entityType: 'Staff',
        entityId: id,
        actorId,
        newState: { employmentStatus: EmploymentStatus.TERMINATED, terminatedAt: now },
      });

      return result;
    });

    await this.cacheService.delete(CACHE_KEYS.STAFF_PROFILE(id));
    await this.cacheService.delete(CACHE_KEYS.BRANCH_ROSTER(terminated.salonId));
    await this.eventBusService.publish(new StaffTerminatedEvent(terminated.id, terminated.salonId, actorId, terminated.terminatedAt!));

    return terminated;
  }

  public async activateStaff(id: string, expectedVersion: number, actorId?: string): Promise<Staff> {
    const existing = await this.getStaff(id);
    const entity = new StaffEntity(existing);

    if (entity.isTerminated()) {
      throw new ValidationException(`Cannot activate terminated staff ${id}`);
    }

    const activated = await this.transactionService.run(async (tx) => {
      const result = await this.staffRepository.update(
        id,
        expectedVersion,
        {
          employmentStatus: EmploymentStatus.ACTIVE,
          updatedById: actorId ?? null,
        },
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        action: 'STAFF_UPDATED',
        entityType: 'Staff',
        entityId: id,
        actorId,
        newState: { employmentStatus: EmploymentStatus.ACTIVE },
      });

      return result;
    });

    await this.cacheService.delete(CACHE_KEYS.STAFF_PROFILE(id));
    await this.cacheService.delete(CACHE_KEYS.BRANCH_ROSTER(activated.salonId));
    await this.eventBusService.publish(new StaffActivatedEvent(activated.id, activated.salonId, activated.userId ?? ''));

    return activated;
  }

  public async suspendStaff(id: string, expectedVersion: number, reason?: string, actorId?: string): Promise<Staff> {
    const existing = await this.getStaff(id);
    const entity = new StaffEntity(existing);

    if (entity.isTerminated()) {
      throw new ValidationException(`Cannot suspend terminated staff ${id}`);
    }

    const suspended = await this.transactionService.run(async (tx) => {
      const result = await this.staffRepository.update(
        id,
        expectedVersion,
        {
          employmentStatus: EmploymentStatus.SUSPENDED,
          updatedById: actorId ?? null,
        },
        tx,
      );

      await this.auditService.logInTransaction(tx, {
        action: 'STAFF_UPDATED',
        entityType: 'Staff',
        entityId: id,
        actorId,
        newState: { employmentStatus: EmploymentStatus.SUSPENDED, reason },
      });

      return result;
    });

    await this.cacheService.delete(CACHE_KEYS.STAFF_PROFILE(id));
    await this.cacheService.delete(CACHE_KEYS.BRANCH_ROSTER(suspended.salonId));
    await this.eventBusService.publish(new StaffUpdatedEvent(suspended.id, suspended.salonId));

    return suspended;
  }

  public async archiveStaff(id: string, expectedVersion: number, actorId?: string): Promise<void> {
    const existing = await this.getStaff(id);
    const entity = new StaffEntity(existing);

    if (entity.isActive()) {
      throw new ValidationException(`Cannot archive active staff member ${id}. Must terminate or suspend first.`);
    }

    await this.transactionService.run(async (tx) => {
      await this.staffRepository.softDelete(id, expectedVersion, tx);

      await this.auditService.logInTransaction(tx, {
        action: 'STAFF_UPDATED',
        entityType: 'Staff',
        entityId: id,
        actorId,
        newState: { employmentStatus: EmploymentStatus.ARCHIVED, deletedAt: new Date() },
      });
    });

    await this.cacheService.delete(CACHE_KEYS.STAFF_PROFILE(id));
    await this.cacheService.delete(CACHE_KEYS.BRANCH_ROSTER(existing.salonId));
  }

  public async getStaff(id: string): Promise<Staff> {
    return this.cacheService.getOrSet(
      CACHE_KEYS.STAFF_PROFILE(id),
      async () => {
        const staff = await this.staffRepository.findById(id);
        if (!staff) {
          throw new ResourceNotFoundException(ERROR_CODES.STAFF.NOT_FOUND, `Staff with ID ${id} not found`);
        }
        return staff;
      },
      CACHE_TTL.STAFF_PROFILE,
    );
  }

  public async searchStaff(query: SearchStaffQueryDto): Promise<{ data: Staff[]; meta: PaginationMeta }> {
    return this.staffRepository.search(query);
  }
}
