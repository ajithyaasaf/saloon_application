/**
 * Validation patterns and RegEx helpers for Indian locale formats and standard identifiers.
 */

export const INDIAN_PHONE_REGEX = /^(?:\+91|91)?[6-9]\d{9}$/;
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
export const INDIAN_PIN_CODE_REGEX = /^[1-9][0-9]{5}$/;
export const IFSC_CODE_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Validates whether the given string is a valid Indian 10-digit mobile number.
 */
export function isValidIndianPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const cleanPhone = phone.trim().replace(/[\s-]/g, '');
  return INDIAN_PHONE_REGEX.test(cleanPhone);
}

/**
 * Normalizes Indian phone string into standard E.164 format (+91XXXXXXXXXX).
 */
export function normalizeIndianPhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';
  const clean = phone.trim().replace(/[\s-]/g, '');
  if (clean.startsWith('+91')) {
    return clean;
  }
  if (clean.startsWith('91') && clean.length === 12) {
    return `+${clean}`;
  }
  if (clean.length === 10) {
    return `+91${clean}`;
  }
  return clean;
}

/**
 * Validates standard 15-character Indian GSTIN structure.
 */
export function isValidGSTIN(gstin: string): boolean {
  if (!gstin || typeof gstin !== 'string') return false;
  return GSTIN_REGEX.test(gstin.trim().toUpperCase());
}

/**
 * Validates standard 10-character Indian PAN format.
 */
export function isValidPAN(pan: string): boolean {
  if (!pan || typeof pan !== 'string') return false;
  return PAN_REGEX.test(pan.trim().toUpperCase());
}

/**
 * Validates standard 6-digit Indian Postal PIN code.
 */
export function isValidIndianPinCode(pincode: string): boolean {
  if (!pincode || typeof pincode !== 'string') return false;
  return INDIAN_PIN_CODE_REGEX.test(pincode.trim());
}

/**
 * Validates standard 11-character Indian IFSC bank code.
 */
export function isValidIFSC(ifsc: string): boolean {
  if (!ifsc || typeof ifsc !== 'string') return false;
  return IFSC_CODE_REGEX.test(ifsc.trim().toUpperCase());
}

/**
 * Validates standard email address format.
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Creates a URL-safe lowercase slug from any text.
 */
export function generateSlug(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
