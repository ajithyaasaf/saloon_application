import { ErrorDefinition } from '../error-codes/error-code.interface';
import { DomainException } from './domain.exception';

/**
 * ConflictException — HTTP 409 Conflict for unique constraint or state conflicts.
 *
 * Architecture ref: Phase 9.1 §3
 */
export class ConflictException extends DomainException {
  constructor(errorDef: ErrorDefinition, customMessage?: string, details?: unknown[]) {
    super(errorDef, customMessage ?? errorDef.description, details);
  }
}
