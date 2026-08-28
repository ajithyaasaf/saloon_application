/**
 * ValidationUtil — Pure validation utility for common Indian domain formats & standards.
 *
 * Thread Safety: 100% Thread-Safe.
 * Determinism: Deterministic.
 * Time Complexity: O(1) for regex validations.
 * Space Complexity: O(1).
 * Dependencies: None (zero framework / class-validator dependencies).
 *
 * Architecture ref: Phase 9.1 §2 (ValidationUtil)
 */
export class ValidationUtil {
  private static readonly EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  private static readonly INDIAN_PHONE_REGEX = /^(?:\+91|91)?[6-9]\d{9}$/;
  private static readonly UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  private static readonly CUID2_REGEX = /^[a-z0-9]{24,32}$/;
  private static readonly GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  private static readonly INDIAN_PINCODE_REGEX = /^[1-9][0-9]{5}$/;

  /**
   * Validates email address format.
   */
  public static isValidEmail(email: string): boolean {
    if (typeof email !== 'string') {
      return false;
    }
    return ValidationUtil.EMAIL_REGEX.test(email.trim());
  }

  /**
   * Validates Indian mobile phone numbers (supports +919876543210, 919876543210, 9876543210).
   */
  public static isValidIndianPhone(phone: string): boolean {
    if (typeof phone !== 'string') {
      return false;
    }
    const sanitized = phone.replace(/[\s-]/g, '');
    return ValidationUtil.INDIAN_PHONE_REGEX.test(sanitized);
  }

  /**
   * Validates UUID v4 string.
   */
  public static isValidUuid(uuid: string): boolean {
    if (typeof uuid !== 'string') {
      return false;
    }
    return ValidationUtil.UUID_V4_REGEX.test(uuid.trim());
  }

  /**
   * Validates CUID2 string.
   */
  public static isValidCuid(cuid: string): boolean {
    if (typeof cuid !== 'string') {
      return false;
    }
    return ValidationUtil.CUID2_REGEX.test(cuid.trim());
  }

  /**
   * Validates Indian Goods and Services Tax Identification Number (GSTIN).
   */
  public static isValidGstin(gstin: string): boolean {
    if (typeof gstin !== 'string') {
      return false;
    }
    return ValidationUtil.GSTIN_REGEX.test(gstin.trim().toUpperCase());
  }

  /**
   * Validates Indian 6-digit PIN Code.
   */
  public static isValidIndianPincode(pincode: string | number): boolean {
    const str = String(pincode).trim();
    return ValidationUtil.INDIAN_PINCODE_REGEX.test(str);
  }

  /**
   * Validates HTTP/HTTPS URL string.
   */
  public static isValidUrl(url: string): boolean {
    if (typeof url !== 'string' || url.trim().length === 0) {
      return false;
    }
    try {
      const parsed = new URL(url.trim());
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // ─── Reserved Signatures for Internationalization ────────────────────────────

  /** Reserved validator signature for IANA timezone string */
  public static isValidTimeZone(tz: string): boolean {
    if (typeof tz !== 'string' || tz.trim().length === 0) return false;
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz.trim() });
      return true;
    } catch {
      return false;
    }
  }

  /** Reserved validator signature for BCP-47 locale tag */
  public static isValidLocale(locale: string): boolean {
    if (typeof locale !== 'string' || locale.trim().length === 0) return false;
    try {
      return Intl.getCanonicalLocales(locale.trim()).length > 0;
    } catch {
      return false;
    }
  }

  /** Reserved validator signature for ISO 4217 currency code (e.g. INR, USD) */
  public static isValidCurrencyCode(code: string): boolean {
    if (typeof code !== 'string') return false;
    return /^[A-Z]{3}$/.test(code.trim().toUpperCase());
  }

  /** Reserved validator signature for ISO 3166-1 alpha-2 country code (e.g. IN, US) */
  public static isValidCountryCode(code: string): boolean {
    if (typeof code !== 'string') return false;
    return /^[A-Z]{2}$/.test(code.trim().toUpperCase());
  }
}
