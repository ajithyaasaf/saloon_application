import { ERROR_CODES } from '../error-codes/error-codes.constant';
import { DomainException } from './domain.exception';

/**
 * ValidationException — HTTP 400 Bad Request for request validation failures.
 *
 * Architecture ref: Phase 9.1 §3
 */
export class ValidationException extends DomainException {
  constructor(customMessage?: string, details?: unknown[]) {
    super(
      ERROR_CODES.VALIDATION.INVALID_INPUT,
      customMessage ?? ERROR_CODES.VALIDATION.INVALID_INPUT.description,
      details,
    );
  }
}
