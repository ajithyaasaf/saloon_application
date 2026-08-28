import { ErrorDefinition } from '../error-codes/error-code.interface';
import { BaseException } from './base.exception';

/**
 * InfrastructureException — Abstract base class for technical and system errors.
 *
 * Architecture ref: Phase 9.1 §3
 */
export abstract class InfrastructureException extends BaseException {
  constructor(
    errorDef: ErrorDefinition,
    customMessage?: string,
    details?: unknown[],
  ) {
    super(errorDef, customMessage, details);
  }
}
