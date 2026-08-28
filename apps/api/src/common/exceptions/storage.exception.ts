import { ERROR_CODES } from '../error-codes/error-codes.constant';
import { InfrastructureException } from './infrastructure.exception';

/**
 * StorageException — HTTP 500 for third-party media storage driver failures.
 *
 * Architecture ref: Phase 9.1 §3
 */
export class StorageException extends InfrastructureException {
  constructor(customMessage?: string, details?: unknown[]) {
    super(
      ERROR_CODES.MEDIA.UPLOAD_FAILED,
      customMessage ?? ERROR_CODES.MEDIA.UPLOAD_FAILED.description,
      details,
    );
  }
}
