import { ERROR_CODES } from '../error-codes/error-codes.constant';
import { DomainException } from './domain.exception';

/**
 * ForbiddenOperationException — HTTP 403 Forbidden for insufficient role permissions.
 *
 * Architecture ref: Phase 9.1 §3
 */
export class ForbiddenOperationException extends DomainException {
  constructor(customMessage?: string, details?: unknown[]) {
    super(
      ERROR_CODES.AUTH.FORBIDDEN,
      customMessage ?? ERROR_CODES.AUTH.FORBIDDEN.description,
      details,
    );
  }
}
