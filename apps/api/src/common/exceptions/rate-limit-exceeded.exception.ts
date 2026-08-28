import { ERROR_CODES } from '../error-codes/error-codes.constant';
import { DomainException } from './domain.exception';

/**
 * RateLimitExceededException — HTTP 429 Too Many Requests when rate limits are breached.
 *
 * Architecture ref: Phase 9.1 §3
 */
export class RateLimitExceededException extends DomainException {
  constructor(customMessage?: string, details?: unknown[]) {
    super(
      ERROR_CODES.AUTH.RATE_LIMITED,
      customMessage ?? ERROR_CODES.AUTH.RATE_LIMITED.description,
      details,
    );
  }
}
