import { ERROR_CODES } from '../error-codes/error-codes.constant';
import { DomainException } from './domain.exception';

/**
 * UnauthorizedOperationException — HTTP 401 Unauthorized for missing or invalid credentials.
 *
 * Architecture ref: Phase 9.1 §3
 */
export class UnauthorizedOperationException extends DomainException {
  constructor(customMessage?: string, details?: unknown[]) {
    super(
      ERROR_CODES.AUTH.TOKEN_INVALID,
      customMessage ?? ERROR_CODES.AUTH.TOKEN_INVALID.description,
      details,
    );
  }
}
