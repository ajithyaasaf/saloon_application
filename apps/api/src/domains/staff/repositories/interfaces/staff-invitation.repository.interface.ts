import { Prisma, StaffInvitationToken } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';

/**
 * IStaffInvitationRepository — Data access contract for secure staff invitation tokens.
 *
 * Architecture ref: Phase 12.0 & Phase 12.2
 */
export interface IStaffInvitationRepository {
  create(data: Prisma.StaffInvitationTokenUncheckedCreateInput, tx?: PrismaTransaction): Promise<StaffInvitationToken>;
  findByHash(tokenHash: string, tx?: PrismaTransaction): Promise<StaffInvitationToken | null>;
  findActiveToken(staffId: string, tx?: PrismaTransaction): Promise<StaffInvitationToken | null>;
  markUsed(id: string, tx?: PrismaTransaction): Promise<StaffInvitationToken>;
  deleteExpired(tx?: PrismaTransaction): Promise<number>;
  invalidateUnusedForStaff(staffId: string, tx?: PrismaTransaction): Promise<void>;
}
