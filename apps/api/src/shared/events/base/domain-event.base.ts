import { IdGeneratorUtil } from '../../../common/utils/id-generator.util';

/**
 * IDomainEvent — Interface contract for all domain events across the platform.
 *
 * Architecture ref: Phase 9.2 §4.4
 */
export interface IDomainEvent<T = unknown> {
  /** Unique ID of the event occurrence */
  readonly eventId: string;
  /** Domain event name formatted as `<aggregate>.<action>.v<version>` (e.g. `user.created.v1`) */
  readonly eventName: string;
  /** Primary aggregate root ID (e.g. `booking_123`, `user_456`) */
  readonly aggregateId: string;
  /** Mandatory event versioning (1, 2, etc.) */
  readonly version: number;
  /** UTC timestamp string when event was generated */
  readonly timestamp: string;
  /** Strongly typed event payload (Plain JSON facts only) */
  readonly payload: T;
  /** Optional correlation ID across workflows */
  readonly correlationId?: string;
  /** Optional correlation HTTP request ID */
  readonly requestId?: string;
  /** Optional correlation distributed trace ID */
  readonly traceId?: string;
  /** Optional event metadata (source, actorId, actorRole, ipAddress, userAgent, tenantId) */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Abstract Base Class for strongly-typed Domain Events.
 */
export abstract class BaseDomainEvent<T = unknown> implements IDomainEvent<T> {
  public readonly eventId: string;
  public readonly timestamp: string;

  constructor(
    public readonly eventName: string,
    public readonly aggregateId: string,
    public readonly version: number,
    public readonly payload: T,
    public readonly correlationId?: string,
    public readonly requestId?: string,
    public readonly traceId?: string,
    public readonly metadata?: Record<string, unknown>,
  ) {
    this.eventId = IdGeneratorUtil.generateUuid();
    this.timestamp = new Date().toISOString();
  }
}
