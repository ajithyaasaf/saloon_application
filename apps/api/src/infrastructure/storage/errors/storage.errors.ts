import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { InfrastructureException } from '../../../common/exceptions/infrastructure.exception';

/**
 * Base abstract exception for all storage provider infrastructure errors.
 */
export class StorageProviderError extends InfrastructureException {
  constructor(message: string, details?: unknown[]) {
    super(ERROR_CODES.MEDIA.UPLOAD_FAILED, message, details);
  }
}

/**
 * Thrown when a storage object is not found in the bucket / storage location.
 */
export class StorageObjectNotFoundError extends InfrastructureException {
  constructor(objectKey: string, details?: unknown[]) {
    super(
      ERROR_CODES.MEDIA.NOT_FOUND,
      `Storage object not found: ${objectKey}`,
      details,
    );
  }
}

/**
 * Thrown when an object upload or stream upload fails.
 */
export class StorageUploadError extends InfrastructureException {
  constructor(message: string, details?: unknown[]) {
    super(ERROR_CODES.MEDIA.UPLOAD_FAILED, message, details);
  }
}

/**
 * Thrown when downloading an object from storage fails.
 */
export class StorageDownloadError extends InfrastructureException {
  constructor(message: string, details?: unknown[]) {
    super(ERROR_CODES.MEDIA.DOWNLOAD_FAILED, message, details);
  }
}

/**
 * Thrown when deleting an object from storage fails.
 */
export class StorageDeleteError extends InfrastructureException {
  constructor(message: string, details?: unknown[]) {
    super(ERROR_CODES.MEDIA.DELETE_FAILED, message, details);
  }
}

/**
 * Thrown when storage provider configuration is invalid or missing required credentials.
 */
export class StorageConfigurationError extends InfrastructureException {
  constructor(message: string, details?: unknown[]) {
    super(ERROR_CODES.MEDIA.CONFIG_ERROR, message, details);
  }
}

/**
 * Thrown when an unsafe or invalid object key (e.g. path traversal, null bytes) is provided.
 */
export class StorageInvalidKeyError extends InfrastructureException {
  constructor(message: string, details?: unknown[]) {
    super(ERROR_CODES.MEDIA.INVALID_KEY, message, details);
  }
}
