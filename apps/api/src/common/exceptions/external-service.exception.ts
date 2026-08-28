import { ERROR_CODES } from '../error-codes/error-codes.constant';
import { InfrastructureException } from './infrastructure.exception';

/**
 * ExternalServiceException — HTTP 502 Bad Gateway for external gateway/API failures.
 *
 * Architecture ref: Phase 9.1 §3
 */
export class ExternalServiceException extends InfrastructureException {
  constructor(customMessage?: string, details?: unknown[]) {
    super(
      ERROR_CODES.EXTERNAL_SERVICE.GATEWAY_ERROR,
      customMessage ?? ERROR_CODES.EXTERNAL_SERVICE.GATEWAY_ERROR.description,
      details,
    );
  }
}
