/**
 * QueueJobOptions — Provider-agnostic options for queue job execution.
 *
 * Architecture ref: Phase 9.2 §4.6
 */
export interface QueueJobOptions {
  /** Execution delay in milliseconds */
  delayMs?: number;
  /** Execution priority (higher integer = higher priority) */
  priority?: number;
  /** Maximum retry attempts on failure */
  attempts?: number;
  /** Backoff delay in milliseconds between retry attempts */
  backoffMs?: number;
  /** Automatically remove job on completion */
  removeOnComplete?: boolean | number;
  /** Automatically remove job on failure */
  removeOnFail?: boolean | number;
  /** Optional custom Job ID for deduplication and idempotency */
  jobId?: string;
}
