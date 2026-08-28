/**
 * CreateAuditLogDto — Data transfer object for writing immutable audit trail records.
 *
 * Architecture ref: Phase 9.2 §4.1
 */
export interface CreateAuditLogDto {
  action: string;
  entityType: string;
  entityId: string;
  actorId?: string;
  actorRole?: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  /** Optional request correlation ID */
  requestId?: string;
  /** Optional distributed trace correlation ID */
  traceId?: string;
  /** Reserved entity version for optimistic concurrency & historical audit tracking */
  entityVersion?: number;
}
