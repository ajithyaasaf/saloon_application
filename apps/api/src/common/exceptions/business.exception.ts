import { ErrorDefinition } from '../error-codes/error-code.interface';
import { DomainException } from './domain.exception';

/**
 * BusinessException — HTTP 422 Unprocessable Entity for domain invariant violations.
 *
 * Architecture ref: Phase 9.1 §3
 */
export class BusinessException extends DomainException {
  constructor(errorDef: ErrorDefinition, customMessage?: string, details?: unknown[]) {
    super(errorDef, customMessage ?? errorDef.description, details);
  }
}
