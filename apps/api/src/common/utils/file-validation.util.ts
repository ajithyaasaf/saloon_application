/**
 * FileValidationUtil — Pure, framework-independent file metadata & size validation utility.
 *
 * Thread Safety: 100% Thread-Safe.
 * Determinism: Deterministic.
 * Time Complexity: O(1) for size/extension checks; O(M) for MIME allowlist search.
 * Space Complexity: O(1).
 * Dependencies: None (zero Multer/Express/framework dependencies).
 *
 * CRITICAL SECURITY NOTICE:
 * File extension and MIME type validation are NOT security boundaries.
 * Malicious actors can spoof extension names and client-supplied Content-Type headers.
 * Binary content inspection (magic bytes / virus scanner) in Infrastructure remains mandatory.
 * This utility performs preliminary metadata validation only.
 *
 * Architecture ref: Phase 9.1 §2 (FileValidationUtil)
 */
export class FileValidationUtil {
  /**
   * Validates if a MIME type exists in an allowlist array.
   */
  public static isValidMimeType(mimeType: string, allowedMimeTypes: string[]): boolean {
    if (typeof mimeType !== 'string' || !Array.isArray(allowedMimeTypes)) {
      return false;
    }
    const normalized = mimeType.trim().toLowerCase();
    return allowedMimeTypes.map((m) => m.toLowerCase()).includes(normalized);
  }

  /**
   * Validates if file size in bytes does not exceed maximum byte limit.
   */
  public static isValidFileSize(sizeInBytes: number, maxSizeBytes: number): boolean {
    if (
      typeof sizeInBytes !== 'number' ||
      !Number.isFinite(sizeInBytes) ||
      typeof maxSizeBytes !== 'number' ||
      !Number.isFinite(maxSizeBytes)
    ) {
      return false;
    }
    return sizeInBytes > 0 && sizeInBytes <= maxSizeBytes;
  }

  /**
   * Extracts lowercase file extension from filename (e.g. 'avatar.png' -> 'png').
   */
  public static getFileExtension(filename: string): string {
    if (typeof filename !== 'string' || !filename.includes('.')) {
      return '';
    }
    const parts = filename.trim().split('.');
    return parts[parts.length - 1].toLowerCase();
  }

  /**
   * Validates if a file extension exists in an allowlist array.
   */
  public static isAllowedExtension(filename: string, allowedExtensions: string[]): boolean {
    const ext = FileValidationUtil.getFileExtension(filename);
    if (!ext || !Array.isArray(allowedExtensions)) {
      return false;
    }
    return allowedExtensions.map((e) => e.toLowerCase().replace(/^\./, '')).includes(ext);
  }
}
