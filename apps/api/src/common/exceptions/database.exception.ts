import { ERROR_CODES } from '../error-codes/error-codes.constant';
import { InfrastructureException } from './infrastructure.exception';

/**
 * DatabaseException — HTTP 500 for unhandled database technical errors.
 *
 * Architecture ref: Phase 9.1 §3
 */
export class DatabaseException extends InfrastructureException {
  constructor(customMessage?: string, details?: unknown[]) {
    super(
      ERROR_CODES.DATABASE.UNHANDLED_ERROR,
      customMessage ?? ERROR_CODES.DATABASE.UNHANDLED_ERROR.description,
      details,
    );
  }
}
