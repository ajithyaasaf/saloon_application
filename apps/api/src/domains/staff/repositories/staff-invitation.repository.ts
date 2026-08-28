import { Injectable, Logger } from '@nestjs/common';
import { Prisma, StaffInvitationToken } from '@prisma/client';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { IStaffInvitationRepository } from './interfaces/staff-invitation.repository.interface';

/**
 * StaffInvitationRepository — Prisma data access for staff invitation tokens.
 *
 * Thread Safety: Thread-safe.
 * Uses Index: `uq_staff_invitation_tokens_hash`, `idx_staff_invitation_tokens_lookup`.
 *
 * Architecture ref: Phase 12.0 & Phase 12.2
 */
@Injectable()
export class StaffInvitationRepository implements IStaffInvitationRepository {
  private readonly logger = new Logger(StaffInvitationRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async create(
    data: Prisma.StaffInvitationTokenUncheckedCreateInput,
    tx?: PrismaTransaction,
  ): Promise<StaffInvitationToken> {
    const client = tx ?? this.prisma;
    try {
      return await client.staffInvitationToken.create({
        data,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Staff invitation creation failed';
      this.logger.error(`StaffInvitationRepository.create error: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  public async findByHash(tokenHash: string, tx?: PrismaTransaction): Promise<StaffInvitationToken | null> {
    const client = tx ?? this.prisma;
    return client.staffInvitationToken.findUnique({
      where: {
        tokenHash,
      },
    });
  }

  public async findActiveToken(staffId: string, tx?: PrismaTransaction): Promise<StaffInvitationToken | null> {
    const client = tx ?? this.prisma;
    return client.staffInvitationToken.findFirst({
      where: {
        staffId,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  public async markUsed(id: string, tx?: PrismaTransaction): Promise<StaffInvitationToken> {
    const client = tx ?? this.prisma;
    try {
      return await client.staffInvitationToken.update({
        where: { id },
        data: {
          usedAt: new Date(),
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Mark invitation used failed';
      this.logger.error(`StaffInvitationRepository.markUsed error: ${message}`);
      const dbErr = new DatabaseException(message);
      (dbErr as any).cause = error;
      throw dbErr;
    }
  }

  public async deleteExpired(tx?: PrismaTransaction): Promise<number> {
    const client = tx ?? this.prisma;
    const result = await client.staffInvitationToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    return result.count;
  }

  public async invalidateUnusedForStaff(staffId: string, tx?: PrismaTransaction): Promise<void> {
    const client = tx ?? this.prisma;
    await client.staffInvitationToken.updateMany({
      where: {
        staffId,
        usedAt: null,
      },
      data: {
        expiresAt: new Date(),
      },
    });
  }
}
