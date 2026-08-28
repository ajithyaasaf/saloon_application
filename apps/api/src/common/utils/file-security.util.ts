import { BadRequestException } from '@nestjs/common';
import { FileCategory } from '@prisma/client';

/**
 * Result of MIME and File Signature validation.
 */
export interface FileSignatureValidationResult {
  isValid: boolean;
  detectedMime: string | null;
  detectedExtension: string | null;
  reason?: string;
}

/**
 * Forbidden executable and script extensions that must never be accepted under any circumstances.
 */
export const DANGEROUS_EXTENSIONS = Object.freeze([
  // Windows executables & libraries
  'exe', 'dll', 'sys', 'com', 'scr', 'cpl', 'msc', 'pif', 'hta', 'msi', 'msp', 'lnk',
  // Shell scripts & batch files
  'bat', 'cmd', 'sh', 'bash', 'zsh', 'ps1', 'psm1', 'psd1', 'vbs', 'vbe', 'ws', 'wsf', 'wsc', 'wsh',
  // Web script engines
  'php', 'phtml', 'php3', 'php4', 'php5', 'php7', 'php8', 'phps', 'phar',
  'jsp', 'jspx', 'jsw', 'jsv', 'jspf',
  'asp', 'aspx', 'axd', 'asx', 'ashx', 'asmx',
  'cgi', 'pl', 'pm', 'py', 'pyc', 'pyo', 'pyd', 'rb', 'rhtml',
  // Compiled code & Java
  'class', 'jar', 'war', 'ear', 'so', 'dylib', 'bin',
  // Client-side active code disguised
  'js', 'mjs', 'cjs', 'ts', 'jsx', 'tsx', 'html', 'htm', 'xhtml', 'shtml', 'svgz',
  // Package installers
  'deb', 'rpm', 'apk', 'dmg', 'iso',
]);

/**
 * Forbidden system metadata keys that cannot be overwritten or injected by user metadata payloads.
 */
export const FORBIDDEN_METADATA_KEYS = Object.freeze([
  'id',
  'salonid',
  'uploadedbyuserid',
  'objectkey',
  'bucket',
  'provider',
  'status',
  'visibility',
  'category',
  'checksum',
  'sizebytes',
  'mimetype',
  'extension',
  'createdat',
  'updatedat',
  'deletedat',
  'version',
]);

/**
 * FileSecurityUtil — Central security engine for binary signature detection,
 * MIME consistency, filename sanitization, double-extension rejection,
 * SVG active-content inspection, and metadata sanitization.
 */
export class FileSecurityUtil {
  public static readonly MAX_FILENAME_LENGTH = 255;
  public static readonly MAX_METADATA_SIZE_BYTES = 32 * 1024; // 32 KB
  public static readonly MAX_METADATA_DEPTH = 3;
  public static readonly MAX_METADATA_KEYS = 50;

  // ─── Binary Magic Bytes & File Signatures ─────────────────────────────────

  /**
   * Sniffs the binary buffer and identifies the actual MIME type and file format.
   * Examines standard magic bytes, container headers, and structural markers.
   */
  public static detectMimeFromBuffer(buffer: Buffer): {
    mime: string | null;
    extension: string | null;
    isExecutable: boolean;
  } {
    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
      return { mime: null, extension: null, isExecutable: false };
    }

    const len = buffer.length;

    // 1. Check for Dangerous Executables & Binaries first
    // Windows PE (MZ)
    if (len >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
      return { mime: 'application/x-dosexec', extension: 'exe', isExecutable: true };
    }
    // Linux ELF (\x7fELF)
    if (len >= 4 && buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
      return { mime: 'application/x-executable', extension: 'elf', isExecutable: true };
    }
    // macOS Mach-O & Java Class (CA FE BA BE, FE ED FA CE, FE ED FA CF, CE FA ED FE, CF FA ED FE)
    if (len >= 4) {
      const b0 = buffer[0], b1 = buffer[1], b2 = buffer[2], b3 = buffer[3];
      if (
        (b0 === 0xca && b1 === 0xfe && b2 === 0xba && b3 === 0xbe) ||
        (b0 === 0xfe && b1 === 0xed && b2 === 0xfa && (b3 === 0xce || b3 === 0xcf)) ||
        ((b0 === 0xce || b0 === 0xcf) && b1 === 0xfa && b2 === 0xed && b3 === 0xfe)
      ) {
        return { mime: 'application/x-mach-binary', extension: 'macho', isExecutable: true };
      }
    }
    // Unix Script Shebang (#!)
    if (len >= 2 && buffer[0] === 0x23 && buffer[1] === 0x21) {
      return { mime: 'application/x-sh', extension: 'sh', isExecutable: true };
    }

    // 2. Images
    // JPEG: FF D8 FF
    if (len >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { mime: 'image/jpeg', extension: 'jpg', isExecutable: false };
    }
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      len >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return { mime: 'image/png', extension: 'png', isExecutable: false };
    }
    // GIF: GIF87a or GIF89a (47 49 46 38 37 61 or 47 49 46 38 39 61)
    if (
      len >= 6 &&
      buffer[0] === 0x47 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x38 &&
      (buffer[4] === 0x37 || buffer[4] === 0x39) &&
      buffer[5] === 0x61
    ) {
      return { mime: 'image/gif', extension: 'gif', isExecutable: false };
    }
    // WebP: RIFF (bytes 0-3) + WEBP (bytes 8-11)
    if (
      len >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return { mime: 'image/webp', extension: 'webp', isExecutable: false };
    }

    // 3. Documents
    // PDF: %PDF- (25 50 44 46 2D)
    if (
      len >= 5 &&
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46 &&
      buffer[4] === 0x2d
    ) {
      return { mime: 'application/pdf', extension: 'pdf', isExecutable: false };
    }

    // 4. Audio
    // MP3 with ID3v2 header: ID3 (49 44 33)
    if (len >= 3 && buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
      return { mime: 'audio/mpeg', extension: 'mp3', isExecutable: false };
    }
    // MP3 without ID3 header (MPEG-1 Layer 3 frame sync: FF FB or FF F3 or FF F2)
    if (len >= 2 && buffer[0] === 0xff && (buffer[1] === 0xfb || buffer[1] === 0xf3 || buffer[1] === 0xf2)) {
      return { mime: 'audio/mpeg', extension: 'mp3', isExecutable: false };
    }
    // WAV: RIFF (bytes 0-3) + WAVE (bytes 8-11)
    if (
      len >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x41 &&
      buffer[10] === 0x56 &&
      buffer[11] === 0x45
    ) {
      return { mime: 'audio/wav', extension: 'wav', isExecutable: false };
    }
    // OGG: OggS (4F 67 67 53)
    if (
      len >= 4 &&
      buffer[0] === 0x4f &&
      buffer[1] === 0x67 &&
      buffer[2] === 0x67 &&
      buffer[3] === 0x53
    ) {
      return { mime: 'audio/ogg', extension: 'ogg', isExecutable: false };
    }

    // 5. Video
    // MP4 / MOV / ISO BMFF: bytes 4-7 equal 'ftyp'
    if (
      len >= 8 &&
      buffer[4] === 0x66 &&
      buffer[5] === 0x74 &&
      buffer[6] === 0x79 &&
      buffer[7] === 0x70
    ) {
      const brand = buffer.slice(8, 12).toString('ascii');
      if (brand.startsWith('qt')) {
        return { mime: 'video/quicktime', extension: 'mov', isExecutable: false };
      }
      if (brand.startsWith('avif') || brand.startsWith('avis')) {
        return { mime: 'image/avif', extension: 'avif', isExecutable: false };
      }
      return { mime: 'video/mp4', extension: 'mp4', isExecutable: false };
    }
    // WebM / Matroska: EBML header 1A 45 DF A3
    if (
      len >= 4 &&
      buffer[0] === 0x1a &&
      buffer[1] === 0x45 &&
      buffer[2] === 0xdf &&
      buffer[3] === 0xa3
    ) {
      return { mime: 'video/webm', extension: 'webm', isExecutable: false };
    }

    // 6. Microsoft Office
    // OLE Compound File (.doc, .xls): D0 CF 11 E0 A1 B1 1A E1
    if (
      len >= 8 &&
      buffer[0] === 0xd0 &&
      buffer[1] === 0xcf &&
      buffer[2] === 0x11 &&
      buffer[3] === 0xe0 &&
      buffer[4] === 0xa1 &&
      buffer[5] === 0xb1 &&
      buffer[6] === 0x1a &&
      buffer[7] === 0xe1
    ) {
      return { mime: 'application/msword', extension: 'doc', isExecutable: false };
    }
    // ZIP / OOXML (.docx, .xlsx, .pptx): 50 4B 03 04 (PK..)
    if (
      len >= 4 &&
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04
    ) {
      return { mime: 'application/vnd.openxmlformats-officedocument', extension: 'docx', isExecutable: false };
    }

    // 7. XML / SVG / Plain Text inspection
    const headerString = buffer.slice(0, Math.min(len, 1024)).toString('utf8').trim();
    if (headerString.startsWith('<?xml') || headerString.startsWith('<svg') || /<svg[^>]*>/i.test(headerString)) {
      return { mime: 'image/svg+xml', extension: 'svg', isExecutable: false };
    }

    // Check if valid plain text / CSV without null bytes or binary control characters
    if (this.isPlausibleText(buffer)) {
      return { mime: 'text/plain', extension: 'txt', isExecutable: false };
    }

    return { mime: null, extension: null, isExecutable: false };
  }

  // ─── Consistency Validation ───────────────────────────────────────────────

  /**
   * Verifies consistency between:
   * 1. Declared MIME type
   * 2. Detected binary signature
   * 3. File extension
   * 4. Polyglot / active payload checks
   */
  public static validateBufferConsistency(
    buffer: Buffer,
    declaredMime: string,
    originalFileName: string,
    _category?: FileCategory,
  ): FileSignatureValidationResult {
    const normalizedDeclaredMime = (declaredMime || '').trim().toLowerCase();
    const detected = this.detectMimeFromBuffer(buffer);

    // 1. Immediately reject dangerous executables/scripts detected by binary signature
    if (detected.isExecutable) {
      return {
        isValid: false,
        detectedMime: detected.mime,
        detectedExtension: detected.extension,
        reason: `File content matches forbidden executable signature (${detected.mime}). Upload rejected.`,
      };
    }

    // 2. Reject dangerous file extensions (including double extension attempts)
    const dangerousExt = this.findDangerousExtension(originalFileName);
    if (dangerousExt) {
      return {
        isValid: false,
        detectedMime: detected.mime,
        detectedExtension: detected.extension,
        reason: `File name contains dangerous executable/script extension: "${dangerousExt}". Upload rejected.`,
      };
    }

    // 3. Reject active script polyglot payloads inside images/documents
    const polyglotThreat = this.detectPolyglotScript(buffer, normalizedDeclaredMime);
    if (polyglotThreat) {
      return {
        isValid: false,
        detectedMime: detected.mime,
        detectedExtension: detected.extension,
        reason: `Malicious polyglot payload detected: ${polyglotThreat}. Upload rejected.`,
      };
    }

    // 4. If SVG, perform strict active content and XXE inspection
    if (
      normalizedDeclaredMime === 'image/svg+xml' ||
      detected.mime === 'image/svg+xml' ||
      originalFileName.toLowerCase().endsWith('.svg')
    ) {
      const svgError = this.validateSvgSafety(buffer);
      if (svgError) {
        return {
          isValid: false,
          detectedMime: 'image/svg+xml',
          detectedExtension: 'svg',
          reason: svgError,
        };
      }
    }

    // 5. Check compatibility between declared MIME and detected signature
    if (detected.mime && !this.isMimeCompatible(normalizedDeclaredMime, detected.mime)) {
      return {
        isValid: false,
        detectedMime: detected.mime,
        detectedExtension: detected.extension,
        reason: `MIME type mismatch: declared "${normalizedDeclaredMime}" does not match detected binary signature "${detected.mime}".`,
      };
    }

    return {
      isValid: true,
      detectedMime: detected.mime ?? normalizedDeclaredMime,
      detectedExtension: detected.extension,
    };
  }

  // ─── Polyglot & Script Inspection ─────────────────────────────────────────

  /**
   * Scans binary buffers (especially image and document headers) for disguised HTML/PHP/JS scripts.
   */
  public static detectPolyglotScript(buffer: Buffer, declaredMime: string): string | null {
    if (!buffer || buffer.length === 0) return null;

    // Inspect the first 4096 bytes (header area)
    const sampleSize = Math.min(buffer.length, 4096);
    const sample = buffer.slice(0, sampleSize).toString('utf8');

    // Reject PHP tags
    if (sample.includes('<?php') || /<\?=/i.test(sample)) {
      return 'Embedded PHP script tags found in binary payload';
    }

    // Reject HTML/Script injection if claiming to be an image (except SVG which has its own sanitizer)
    if (
      declaredMime.startsWith('image/') &&
      declaredMime !== 'image/svg+xml'
    ) {
      if (/<script\b[^>]*>/i.test(sample) || /<\/script>/i.test(sample)) {
        return 'Embedded <script> tags found in image binary';
      }
      if (/<html\b/i.test(sample) || /<body\b/i.test(sample) || /<!DOCTYPE\s+html/i.test(sample)) {
        return 'Embedded HTML markup found in raster image payload';
      }
    }

    // Reject executable code in PDF header
    if (declaredMime === 'application/pdf') {
      if (sample.startsWith('MZ') || sample.startsWith('\x7fELF')) {
        return 'Executable header disguised as PDF document';
      }
    }

    return null;
  }

  /**
   * Validates SVG content against active scripts, event handlers, and XML external entities (XXE).
   */
  public static validateSvgSafety(buffer: Buffer): string | null {
    const content = buffer.toString('utf8');

    // Check for script tags
    if (/<script\b[^>]*>/i.test(content) || /<\/script>/i.test(content)) {
      return 'SVG contains active <script> elements';
    }

    // Check for inline JavaScript event handlers (e.g. onload, onerror, onclick)
    if (/\bon[a-z]+\s*=/i.test(content)) {
      return 'SVG contains active JavaScript event handler attributes';
    }

    // Check for javascript: pseudo-protocol in URLs
    if (/javascript\s*:/i.test(content)) {
      return 'SVG contains javascript: URI schemes';
    }

    // Check for foreignObject which can embed arbitrary HTML
    if (/<foreignObject\b/i.test(content)) {
      return 'SVG contains <foreignObject> container elements';
    }

    // Check for XML External Entity (XXE) attacks
    if (/<!ENTITY\b/i.test(content) || /<!DOCTYPE[^>]*\[/i.test(content)) {
      return 'SVG contains XML entity declarations (XXE risk)';
    }

    return null;
  }

  // ─── Filename & Path Traversal Security ────────────────────────────────────

  /**
   * Checks if filename contains dangerous extensions (including double extension attacks).
   * Example: 'photo.php.jpg' or 'avatar.exe'
   */
  public static findDangerousExtension(filename: string): string | null {
    if (!filename || typeof filename !== 'string') return null;

    const normalized = filename.toLowerCase().trim();
    const segments = normalized.split('.');

    if (segments.length < 2) return null;

    // Check all extensions after the first dot
    for (let i = 1; i < segments.length; i++) {
      const ext = segments[i].trim();
      if (DANGEROUS_EXTENSIONS.includes(ext)) {
        return ext;
      }
    }

    return null;
  }

  /**
   * Sanitizes original filenames:
   * - Strips path traversal (../, ..\)
   * - Strips null bytes (\0, %00)
   * - Strips control characters and Unicode bidirectional overrides
   * - Clamps length to MAX_FILENAME_LENGTH (255 chars)
   */
  public static sanitizeFileName(filename: string): string {
    if (!filename || typeof filename !== 'string') {
      return 'unnamed-file';
    }

    let sanitized = filename.trim();

    // 1. Remove null bytes and encoded null bytes
    sanitized = sanitized.replace(/\0/g, '').replace(/%00/gi, '');

    // 2. Remove control characters (ASCII 0-31, 127) and Unicode Bidi control characters
    // eslint-disable-next-line no-control-regex
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
    sanitized = sanitized.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '');

    // 3. Strip directory paths (keep only the basename)
    sanitized = sanitized.replace(/^.*[/\\]/, '');

    // 4. Remove path traversal sequences
    sanitized = sanitized.replace(/\.\.+/g, '.');

    // 5. Replace potentially dangerous filesystem characters with underscore
    sanitized = sanitized.replace(/[<>:"/\\|?*]/g, '_');

    // 6. Clamp length to max 255 characters while preserving extension
    if (sanitized.length > this.MAX_FILENAME_LENGTH) {
      const lastDot = sanitized.lastIndexOf('.');
      if (lastDot > 0) {
        const ext = sanitized.slice(lastDot);
        const namePart = sanitized.slice(0, this.MAX_FILENAME_LENGTH - ext.length);
        sanitized = `${namePart}${ext}`;
      } else {
        sanitized = sanitized.slice(0, this.MAX_FILENAME_LENGTH);
      }
    }

    // 7. Fallback if empty or invalid
    if (sanitized.length === 0 || sanitized === '.' || sanitized === '..') {
      return 'unnamed-file';
    }

    return sanitized;
  }

  /**
   * Sanitizes filenames for use in HTTP Content-Disposition headers.
   * Prevents HTTP Response Splitting / CRLF injection and quote breakout.
   */
  public static sanitizeContentDispositionFilename(filename: string): string {
    if (!filename || typeof filename !== 'string') {
      return 'attachment';
    }

    let clean = filename.trim();

    // Remove CRLF
    clean = clean.replace(/[\r\n]/g, '');

    // Remove double quotes and backslashes
    clean = clean.replace(/["\\]/g, '');

    // Remove control characters
    // eslint-disable-next-line no-control-regex
    clean = clean.replace(/[\x00-\x1F\x7F]/g, '');

    // Trim dots and spaces
    clean = clean.replace(/^[.\s]+|[.\s]+$/g, '');

    if (clean.length === 0) {
      return 'attachment';
    }

    return clean;
  }

  // ─── Metadata Security ────────────────────────────────────────────────────

  /**
   * Sanitizes untrusted user-supplied metadata:
   * - Strips system-reserved keys
   * - Enforces max depth (<= 3)
   * - Enforces max top-level keys (<= 50)
   * - Enforces serialized size limits (<= 32 KB)
   * - Strips sensitive credential patterns (password, secret, token, apiKey)
   */
  public static sanitizeCustomMetadata(rawMetadata: any): Record<string, any> | null {
    if (!rawMetadata || typeof rawMetadata !== 'object' || Array.isArray(rawMetadata)) {
      return null;
    }

    // Verify JSON size
    let serialized: string;
    try {
      serialized = JSON.stringify(rawMetadata);
    } catch {
      throw new BadRequestException('Invalid metadata JSON structure.');
    }

    if (Buffer.byteLength(serialized, 'utf8') > this.MAX_METADATA_SIZE_BYTES) {
      throw new BadRequestException(
        `Metadata size exceeds maximum allowed limit of ${this.MAX_METADATA_SIZE_BYTES / 1024} KB.`,
      );
    }

    const cleanObject = this.cleanMetadataRecursive(rawMetadata, 1);
    return Object.keys(cleanObject).length > 0 ? cleanObject : null;
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private static cleanMetadataRecursive(obj: any, depth: number): Record<string, any> {
    if (depth > this.MAX_METADATA_DEPTH || !obj || typeof obj !== 'object' || Array.isArray(obj)) {
      return {};
    }

    const result: Record<string, any> = {};
    const keys = Object.keys(obj);

    if (keys.length > this.MAX_METADATA_KEYS && depth === 1) {
      throw new BadRequestException(
        `Metadata contains ${keys.length} keys, exceeding limit of ${this.MAX_METADATA_KEYS}.`,
      );
    }

    for (const key of keys) {
      const lowerKey = key.toLowerCase().trim();

      // Skip forbidden system keys
      if (FORBIDDEN_METADATA_KEYS.includes(lowerKey)) {
        continue;
      }

      // Skip keys containing sensitive credential keywords
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('apikey') ||
        lowerKey.includes('api_key') ||
        lowerKey.includes('private_key') ||
        lowerKey.includes('token')
      ) {
        continue;
      }

      const val = obj[key];

      if (val === null || val === undefined) {
        continue;
      }

      if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
        result[key] = val;
      } else if (Array.isArray(val)) {
        // Allow arrays of primitives only
        result[key] = val.filter(
          (item) => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean',
        );
      } else if (typeof val === 'object') {
        const nested = this.cleanMetadataRecursive(val, depth + 1);
        if (Object.keys(nested).length > 0) {
          result[key] = nested;
        }
      }
    }

    return result;
  }

  private static isMimeCompatible(declared: string, detected: string): boolean {
    if (declared === detected) return true;

    // Handle generic document / office formats
    if (
      declared.includes('wordprocessingml') ||
      declared.includes('spreadsheetml') ||
      declared.includes('presentationml')
    ) {
      return detected === 'application/vnd.openxmlformats-officedocument';
    }

    // JPEG variants
    if (
      (declared === 'image/jpeg' || declared === 'image/jpg') &&
      (detected === 'image/jpeg' || detected === 'image/jpg')
    ) {
      return true;
    }

    // MP4 variants
    if (
      (declared === 'video/mp4' || declared === 'video/quicktime') &&
      (detected === 'video/mp4' || detected === 'video/quicktime')
    ) {
      return true;
    }

    return false;
  }

  private static isPlausibleText(buffer: Buffer): boolean {
    const checkLen = Math.min(buffer.length, 512);
    for (let i = 0; i < checkLen; i++) {
      const byte = buffer[i];
      // Null byte indicates binary content
      if (byte === 0x00) return false;
      // Control characters other than tab, newline, carriage return
      if (byte < 0x09 || (byte > 0x0d && byte < 0x20)) return false;
    }
    return true;
  }
}
