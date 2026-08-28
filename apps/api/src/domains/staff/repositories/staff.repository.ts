import { Injectable, Logger } from '@nestjs/common';
import { EmploymentStatus, Prisma, Staff } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PaginationMeta } from '../../../common/types/pagination.type';
import { PaginationUtil } from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { SearchStaffQueryDto } from '../dto/search-staff-query.dto';
import { IStaffRepository } from './interfaces/staff.repository.interface';

/**
 * StaffRepository — Prisma data access for Staff aggregate root.
 *
 * Thread Safety: Thread-safe.
 * Soft Delete: Filters `deletedAt IS NULL`.
 * Optimistic Locking: Validates and increments `version`.
 * Uses Index: `idx_staff_salon_status_deleted`, `idx_staff_salon_role_status`, `idx_staff_user`, `uq_staff_salon_employee_code`.
 *
 * Architecture ref: Phase 12.0 & Phase 12.2
 */
@Injectable()
export class StaffRepository implements IStaffRepository {
  private readonly logger = new Logger(StaffRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<Staff | null> {
    const client = tx ?? this.prisma;
    return client.staff.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  public async findByUserId(userId: string, tx?: PrismaTransaction): Promise<Staff | null> {
    const client = tx ?? this.prisma;
    return client.staff.findFirst({
      where: {
        userId,
        deletedAt: null,
      },
    });
  }

  public async findByEmployeeCode(salonId: string, employeeCode: string, tx?: PrismaTransaction): Promise<Staff | null> {
    const client = tx ?? this.prisma;
    return client.staff.findFirst({
      where: {
        salonId,
        employeeCode,
        deletedAt: null,
      },
    });
  }

  public async countBySalon(salonId: string, tx?: PrismaTransaction): Promise<number> {
    const client = tx ?? this.prisma;
    return client.staff.count({
      where: {
        salonId,
        deletedAt: null,
      },
    });
  }

  public async findActive(salonId: string, tx?: PrismaTransaction): Promise<Staff[]> {
    const client = tx ?? this.prisma;
    return client.staff.findMany({
      where: {
        salonId,
        employmentStatus: EmploymentStatus.ACTIVE,
        deletedAt: null,
      },
      orderBy: { displayName: 'asc' },
    });
  }

  public async findBySalon(
    salonId: string,
    query?: SearchStaffQueryDto,
    tx?: PrismaTransaction,
  ): Promise<{ data: Staff[]; meta: PaginationMeta }> {
    return this.search({ ...query, salonId }, tx);
  }

  public async create(data: Prisma.StaffUncheckedCreateInput, tx?: PrismaTransaction): Promise<Staff> {
    const client = tx ?? this.prisma;
    try {
      return await client.staff.create({
        data: {
          ...data,
          version: 1,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Staff creation failed';
      this.logger.error(`StaffRepository.create error: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  public async update(
    id: string,
    expectedVersion: number,
    data: Prisma.StaffUncheckedUpdateInput,
    tx?: PrismaTransaction,
  ): Promise<Staff> {
    const client = tx ?? this.prisma;
    const existing = await this.findById(id, tx);
    if (!existing) {
      throw new DatabaseException(`Staff with ID ${id} not found`);
    }

    if (existing.version !== expectedVersion) {
      throw new ConflictException(
        ERROR_CODES.DATABASE.UNIQUE_VIOLATION,
        `Optimistic concurrency failure: Staff ${id} has version ${existing.version}, expected ${expectedVersion}`,
      );
    }

    try {
      return await client.staff.update({
        where: { id },
        data: {
          ...data,
          version: { increment: 1 },
        },
      });
    } catch (error: unknown) {
      if (error instanceof ConflictException) throw error;
      const message = error instanceof Error ? error.message : 'Staff update failed';
      this.logger.error(`StaffRepository.update error: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  public async softDelete(id: string, expectedVersion: number, tx?: PrismaTransaction): Promise<void> {
    await this.update(id, expectedVersion, { deletedAt: new Date(), employmentStatus: EmploymentStatus.ARCHIVED }, tx);
  }

  public async search(
    query: SearchStaffQueryDto,
    tx?: PrismaTransaction,
  ): Promise<{ data: Staff[]; meta: PaginationMeta }> {
    const client = tx ?? this.prisma;
    const normParams = PaginationUtil.normalizeParams(query.page, query.limit);
    const { skip, take } = PaginationUtil.getSkipTake(normParams);

    const where: Prisma.StaffWhereInput = {
      deletedAt: null,
      ...(query.salonId ? { salonId: query.salonId } : {}),
      ...(query.employmentStatus ? { employmentStatus: query.employmentStatus } : {}),
      ...(query.role ? { role: query.role } : {}),
      ...(query.employeeCode ? { employeeCode: query.employeeCode } : {}),
      ...(query.branchId
        ? {
            branchAssignments: {
              some: {
                branchId: query.branchId,
                isActive: true,
                deletedAt: null,
              },
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { displayName: { contains: query.search, mode: 'insensitive' } },
              { employeeCode: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const dir = (query.sortDirection || query.sortDir || 'DESC').toUpperCase() === 'ASC' ? 'asc' : 'desc';
    const sortByField = query.sortBy || 'createdAt';
    const orderBy: Prisma.StaffOrderByWithRelationInput = { [sortByField]: dir };

    const [items, totalItems] = await Promise.all([
      client.staff.findMany({
        where,
        skip,
        take,
        orderBy,
      }),
      client.staff.count({ where }),
    ]);

    const meta = PaginationUtil.buildMeta(totalItems, normParams);
    return { data: items, meta };
  }
}
