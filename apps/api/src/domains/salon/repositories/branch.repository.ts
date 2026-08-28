import { Injectable, Logger } from '@nestjs/common';
import { Branch, Prisma } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { IBranchRepository } from './interfaces/branch.repository.interface';

/**
 * BranchRepository — Prisma data access implementation for Branch entities.
 *
 * Thread Safety: 100% Thread-Safe.
 * Spatial Queries: Calculates spherical earth distances using latitude and longitude.
 *
 * Architecture ref: Phase 10.0 & Phase 10.2
 */
@Injectable()
export class BranchRepository implements IBranchRepository {
  private readonly logger = new Logger(BranchRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findById(id: string, tx?: PrismaTransaction): Promise<Branch | null> {
    const client = tx ?? this.prisma;
    return client.branch.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  public async findBySalonId(salonId: string, tx?: PrismaTransaction): Promise<Branch[]> {
    const client = tx ?? this.prisma;
    return client.branch.findMany({
      where: {
        salonId,
        deletedAt: null,
      },
      orderBy: { isPrimary: 'desc' },
    });
  }

  public async findPrimaryBranch(salonId: string, tx?: PrismaTransaction): Promise<Branch | null> {
    const client = tx ?? this.prisma;
    return client.branch.findFirst({
      where: {
        salonId,
        isPrimary: true,
        deletedAt: null,
      },
    });
  }

  public async create(data: Prisma.BranchUncheckedCreateInput, tx?: PrismaTransaction): Promise<Branch> {
    const client = tx ?? this.prisma;
    try {
      return await client.branch.create({
        data: {
          ...data,
          version: 1,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Branch creation failed';
      this.logger.error(`BranchRepository.create error: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  public async update(
    id: string,
    expectedVersion: number,
    data: Prisma.BranchUncheckedUpdateInput,
    tx?: PrismaTransaction,
  ): Promise<Branch> {
    const client = tx ?? this.prisma;
    const existing = await this.findById(id, tx);
    if (!existing) {
      throw new DatabaseException(`Branch with ID ${id} not found`);
    }

    if (existing.version !== expectedVersion) {
      throw new ConflictException(
        ERROR_CODES.DATABASE.UNIQUE_VIOLATION,
        `Optimistic concurrency failure: Branch ${id} has version ${existing.version}, expected ${expectedVersion}`,
      );
    }

    try {
      return await client.branch.update({
        where: { id },
        data: {
          ...data,
          version: { increment: 1 },
        },
      });
    } catch (error: unknown) {
      if (error instanceof ConflictException) throw error;
      const message = error instanceof Error ? error.message : 'Branch update failed';
      this.logger.error(`BranchRepository.update error: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  public async setPrimaryBranch(
    salonId: string,
    newPrimaryBranchId: string,
    tx?: PrismaTransaction,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    await client.branch.updateMany({
      where: { salonId, isPrimary: true },
      data: { isPrimary: false },
    });

    await client.branch.update({
      where: { id: newPrimaryBranchId },
      data: { isPrimary: true },
    });
  }

  public async softDelete(id: string, expectedVersion: number, tx?: PrismaTransaction): Promise<void> {
    await this.update(id, expectedVersion, { deletedAt: new Date() }, tx);
  }

  public async findNearby(
    lat: number,
    lng: number,
    radiusKm: number,
    limit = 20,
    tx?: PrismaTransaction,
  ): Promise<Branch[]> {
    const client = tx ?? this.prisma;
    const branches = await client.branch.findMany({
      where: {
        deletedAt: null,
      },
      take: limit * 2,
    });

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371; // Earth's radius in KM
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    return branches
      .filter((b) => calculateDistance(lat, lng, b.latitude, b.longitude) <= radiusKm)
      .slice(0, limit);
  }
}
