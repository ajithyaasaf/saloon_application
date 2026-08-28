import { UserRole } from '@prisma/client';
import { FileAssetAuditAction, FileAssetAuditOutcome } from '../constants/file-asset-audit.constants';

/**
 * Query parameters for filtering File Asset audit logs.
 */
export interface FileAssetAuditQueryDto {
  /**
   * Filter by specific FileAsset ID.
   */
  fileAssetId?: string;

  /**
   * Filter by specific salon/tenant ID.
   */
  salonId?: string;

  /**
   * Filter by specific actor user ID.
   */
  actorId?: string;

  /**
   * Filter by specific audit action.
   */
  action?: FileAssetAuditAction | string;

  /**
   * Filter by outcome (SUCCESS, FAILURE, DENIED).
   */
  outcome?: FileAssetAuditOutcome | string;

  /**
   * Filter records created on or after this ISO date string.
   */
  dateFrom?: string;

  /**
   * Filter records created on or before this ISO date string.
   */
  dateTo?: string;

  /**
   * Page number (1-based, default 1).
   */
  page?: number;

  /**
   * Page size limit (1-100, default 20).
   */
  limit?: number;
}

/**
 * Representation of a File Asset audit log record returned to clients/admins.
 */
export interface FileAssetAuditRecord {
  id: string;
  whoId: string;
  role: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  outcome?: FileAssetAuditOutcome | string;
  salonId?: string | null;
  details?: Record<string, unknown> | null;
  previousState?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
}
