import { ErrorDefinition } from '../error-codes/error-code.interface';
import { BaseException } from './base.exception';

/**
 * DomainException — Abstract base class for all business and domain errors.
 *
 * Architecture ref: Phase 9.1 §3
 */
export abstract class DomainException extends BaseException {
  constructor(
    errorDef: ErrorDefinition,
    customMessage?: string,
    details?: unknown[],
  ) {
    super(errorDef, customMessage, details);
  }
}
