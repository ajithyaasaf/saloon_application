import { StorageInvalidKeyError } from '../errors/storage.errors';

/**
 * StorageSecurityUtil — Security controls and sanitization for storage object keys.
 *
 * Prevents:
 *  - Directory / path traversal attacks (e.g., `../`, `..\`)
 *  - Null byte injection attacks (`\0`, `%00`)
 *  - Control character injection
 *  - Absolute root escapes
 *  - Excessive length keys
 */
export class StorageSecurityUtil {
  public static readonly MAX_KEY_LENGTH = 1024;

  /**
   * Checks whether a storage object key is safe and well-formed.
   */
  public static isSafeObjectKey(objectKey: string): boolean {
    if (!objectKey || typeof objectKey !== 'string') {
      return false;
    }

    const trimmed = objectKey.trim();
    if (trimmed.length === 0 || trimmed.length > this.MAX_KEY_LENGTH) {
      return false;
    }

    // Check for null bytes and encoded null bytes
    if (trimmed.includes('\0') || /%00/i.test(trimmed)) {
      return false;
    }

    // Check for control characters (ASCII 0-31 and 127)
    // eslint-disable-next-line no-control-regex
    if (/[\x00-\x1F\x7F]/.test(trimmed)) {
      return false;
    }

    // Check for absolute root escapes or Windows drive letters
    if (
      trimmed.startsWith('/') ||
      trimmed.startsWith('\\') ||
      /^[a-zA-Z]:/.test(trimmed)
    ) {
      return false;
    }

    // Check for directory traversal sequences
    const normalizedSlashes = trimmed.replace(/\\/g, '/');
    const segments = normalizedSlashes.split('/');

    for (const segment of segments) {
      if (segment === '..' || segment === '.') {
        return false;
      }
    }

    if (/\.\.\//.test(normalizedSlashes) || /\/\.\./.test(normalizedSlashes)) {
      return false;
    }

    return true;
  }

  /**
   * Sanitizes an object key by normalizing slashes and removing leading/trailing slashes.
   */
  public static sanitizeObjectKey(objectKey: string): string {
    if (!this.isSafeObjectKey(objectKey)) {
      throw new StorageInvalidKeyError(
        `Object key contains invalid characters or path traversal sequences: "${objectKey}"`,
      );
    }

    return objectKey
      .trim()
      .replace(/\\/g, '/')
      .replace(/\/+/g, '/')
      .replace(/^\/+|\/+$/g, '');
  }

  /**
   * Asserts that an object key is safe, returning the sanitized version.
   * Throws `StorageInvalidKeyError` if unsafe.
   */
  public static assertSafeObjectKey(objectKey: string): string {
    return this.sanitizeObjectKey(objectKey);
  }
}
