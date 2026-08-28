import { ErrorDefinition } from '../error-codes/error-code.interface';
import { DomainException } from './domain.exception';

/**
 * ResourceNotFoundException — HTTP 404 Not Found for missing domain entities.
 *
 * Architecture ref: Phase 9.1 §3
 */
export class ResourceNotFoundException extends DomainException {
  constructor(errorDef: ErrorDefinition, customMessage?: string, details?: unknown[]) {
    super(errorDef, customMessage ?? errorDef.description, details);
  }
}
