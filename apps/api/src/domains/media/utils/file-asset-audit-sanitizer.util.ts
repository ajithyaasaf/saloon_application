/**
 * FileAssetAuditSanitizer — Centralized security sanitizer for file asset audit metadata.
 *
 * Conforms to Phase 20.10 §8, §9, §15:
 *  - Strips credentials, tokens, AWS/R2 signatures, authorization headers, cookies
 *  - Strips presigned query strings from URLs
 *  - Strips binary buffer payloads
 *  - Neutralizes CRLF / log injection sequences
 *  - Enforces depth (<= 3), key count (<= 30), string length (<= 500), and size (<= 16 KB) limits
 */
export class FileAssetAuditSanitizer {
  public static readonly MAX_DEPTH = 3;
  public static readonly MAX_KEYS = 30;
  public static readonly MAX_STRING_LENGTH = 500;
  public static readonly MAX_SERIALIZED_SIZE_BYTES = 16 * 1024; // 16 KB

  private static readonly SENSITIVE_KEY_PATTERNS = [
    /password/i,
    /secret/i,
    /apikey/i,
    /api_key/i,
    /token/i,
    /auth/i,
    /bearer/i,
    /signature/i,
    /credential/i,
    /cookie/i,
    /x-amz-/i,
    /x-goog-/i,
    /session/i,
  ];

  /**
   * Sanitizes an audit metadata object, stripping sensitive data and enforcing safety limits.
   */
  public static sanitizeMetadata(
    metadata?: Record<string, unknown> | null,
    currentDepth = 1,
  ): Record<string, unknown> | null {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return null;
    }

    if (currentDepth > this.MAX_DEPTH) {
      return null;
    }

    const sanitized: Record<string, unknown> = {};
    const entries = Object.entries(metadata);
    let keyCount = 0;

    for (const [key, val] of entries) {
      if (keyCount >= this.MAX_KEYS) {
        break;
      }

      // Check for sensitive key patterns
      if (this.isSensitiveKey(key)) {
        continue;
      }

      const sanitizedVal = this.sanitizeValue(val, currentDepth);
      if (sanitizedVal !== undefined) {
        sanitized[this.sanitizeString(key)] = sanitizedVal;
        keyCount++;
      }
    }

    // Enforce overall size limit
    try {
      const json = JSON.stringify(sanitized);
      if (Buffer.byteLength(json, 'utf8') > this.MAX_SERIALIZED_SIZE_BYTES) {
        return {
          _warning: 'Audit metadata exceeded maximum size limit and was truncated.',
          keysPresent: Object.keys(sanitized).slice(0, 10),
        };
      }
    } catch {
      return null;
    }

    return Object.keys(sanitized).length > 0 ? sanitized : null;
  }

  /**
   * Strips query-string signatures from presigned URLs, leaving only the safe base URL.
   */
  public static sanitizeUrl(url?: string | null): string | null {
    if (!url || typeof url !== 'string') {
      return null;
    }

    try {
      const parsed = new URL(url);
      // Remove sensitive query parameters
      const safeParams = new URLSearchParams();
      for (const [k, v] of parsed.searchParams.entries()) {
        if (
          !this.isSensitiveKey(k) &&
          !k.toLowerCase().startsWith('x-amz-') &&
          !k.toLowerCase().startsWith('x-goog-')
        ) {
          safeParams.append(k, v);
        }
      }
      parsed.search = safeParams.toString();
      return parsed.toString();
    } catch {
      // Fallback: split at query string
      const qIndex = url.indexOf('?');
      return qIndex >= 0 ? url.substring(0, qIndex) : url.substring(0, this.MAX_STRING_LENGTH);
    }
  }

  /**
   * Strips CRLF and control characters from string values to prevent log injection.
   */
  public static sanitizeString(str: string): string {
    if (!str || typeof str !== 'string') {
      return '';
    }

    // Replace CRLF and control characters with safe space, clamp length
    const cleaned = str
      .replace(/[\r\n\t]/g, ' ')
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1F\x7F]/g, '')
      .trim();

    return cleaned.length > this.MAX_STRING_LENGTH
      ? cleaned.substring(0, this.MAX_STRING_LENGTH)
      : cleaned;
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  private static isSensitiveKey(key: string): boolean {
    return this.SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
  }

  private static sanitizeValue(val: unknown, depth: number): unknown {
    if (val === null || val === undefined) {
      return undefined;
    }

    // Strip binary buffers
    if (Buffer.isBuffer(val) || (typeof ArrayBuffer !== 'undefined' && val instanceof ArrayBuffer)) {
      return '[BINARY_BUFFER_OMITTED]';
    }

    if (typeof val === 'string') {
      // Check if value looks like a signed URL
      if (val.includes('?') && (val.includes('X-Amz-') || val.includes('token='))) {
        return this.sanitizeUrl(val);
      }
      return this.sanitizeString(val);
    }

    if (typeof val === 'number' || typeof val === 'boolean') {
      return val;
    }

    if (val instanceof Date) {
      return val.toISOString();
    }

    if (Array.isArray(val)) {
      if (depth >= this.MAX_DEPTH) {
        return undefined;
      }
      return val
        .slice(0, 10)
        .map((item) => this.sanitizeValue(item, depth + 1))
        .filter((item) => item !== undefined);
    }

    if (typeof val === 'object') {
      if (depth >= this.MAX_DEPTH) {
        return undefined;
      }
      const child = this.sanitizeMetadata(val as Record<string, unknown>, depth + 1);
      return child !== null ? child : undefined;
    }

    return undefined;
  }
}
