import { HttpStatus } from '@nestjs/common';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import {
  StorageConfigurationError,
  StorageDeleteError,
  StorageDownloadError,
  StorageInvalidKeyError,
  StorageObjectNotFoundError,
  StorageProviderError,
  StorageUploadError,
} from '../errors/storage.errors';

describe('Storage Error Classes', () => {
  it('should construct StorageObjectNotFoundError with NOT_FOUND status (404)', () => {
    const error = new StorageObjectNotFoundError('salons/123/missing.jpg');
    expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(error.code).toBe(ERROR_CODES.MEDIA.NOT_FOUND.code);
    expect(error.message).toContain('missing.jpg');
  });

  it('should construct StorageUploadError with UPLOAD_FAILED status (500)', () => {
    const error = new StorageUploadError('Network failure during upload');
    expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(error.code).toBe(ERROR_CODES.MEDIA.UPLOAD_FAILED.code);
  });

  it('should construct StorageDownloadError with DOWNLOAD_FAILED status (500)', () => {
    const error = new StorageDownloadError('Corrupted stream');
    expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(error.code).toBe(ERROR_CODES.MEDIA.DOWNLOAD_FAILED.code);
  });

  it('should construct StorageDeleteError with DELETE_FAILED status (500)', () => {
    const error = new StorageDeleteError('Permission denied');
    expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(error.code).toBe(ERROR_CODES.MEDIA.DELETE_FAILED.code);
  });

  it('should construct StorageConfigurationError with CONFIG_ERROR status (500)', () => {
    const error = new StorageConfigurationError('Missing R2_ACCOUNT_ID');
    expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(error.code).toBe(ERROR_CODES.MEDIA.CONFIG_ERROR.code);
  });

  it('should construct StorageInvalidKeyError with INVALID_KEY status (400)', () => {
    const error = new StorageInvalidKeyError('Path traversal detected');
    expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    expect(error.code).toBe(ERROR_CODES.MEDIA.INVALID_KEY.code);
  });

  it('should construct base StorageProviderError with details', () => {
    const details = [{ reason: 'timeout' }];
    const error = new StorageProviderError('Provider failed', details);
    expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(error.details).toEqual(details);
  });
});
