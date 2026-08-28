import { ERROR_CODES } from '../error-codes/error-codes.constant';
import { InfrastructureException } from './infrastructure.exception';

/**
 * QueueException — HTTP 500 for background message queue dispatch failures.
 *
 * Architecture ref: Phase 9.1 §3
 */
export class QueueException extends InfrastructureException {
  constructor(customMessage?: string, details?: unknown[]) {
    super(
      ERROR_CODES.QUEUE.DISPATCH_FAILED,
      customMessage ?? ERROR_CODES.QUEUE.DISPATCH_FAILED.description,
      details,
    );
  }
}
