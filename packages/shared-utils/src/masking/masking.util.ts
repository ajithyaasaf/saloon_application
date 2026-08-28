/**
 * PII masking helpers for secure client-side UI rendering and logging.
 */

/**
 * Mask a phone number, showing only the last 4 digits (e.g. +91 9876543210 -> +91 ******3210 or ******3210).
 */
export function maskPhone(phone?: string | null): string {
  if (!phone || typeof phone !== 'string') return '';
  const clean = phone.trim();
  if (clean.length <= 4) return '****';

  const last4 = clean.slice(-4);
  const prefix = clean.startsWith('+91') ? '+91 ' : '';
  const restLength = Math.max(0, clean.length - (prefix ? 3 : 0) - 4);
  const stars = '*'.repeat(Math.max(4, restLength));

  return `${prefix}${stars}${last4}`;
}

/**
 * Mask an email address, revealing only first 2 chars of username, domain, and TLD (e.g. priya.sharma@example.com -> pr***@example.com).
 */
export function maskEmail(email?: string | null): string {
  if (!email || typeof email !== 'string') return '';
  const clean = email.trim();
  const atIndex = clean.indexOf('@');
  if (atIndex <= 1) return '***@***.***';

  const username = clean.substring(0, atIndex);
  const domain = clean.substring(atIndex);

  if (username.length <= 2) {
    return `${username[0]}***${domain}`;
  }

  const prefix = username.substring(0, 2);
  return `${prefix}***${domain}`;
}

/**
 * Mask a payment card number, preserving only the last 4 digits (e.g. 4111222233334444 -> **** **** **** 4444).
 */
export function maskCardNumber(cardNumber?: string | null): string {
  if (!cardNumber || typeof cardNumber !== 'string') return '';
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 4) return '****';

  const last4 = digits.slice(-4);
  return `**** **** **** ${last4}`;
}

/**
 * Mask a bank account number, preserving only the last 4 digits.
 */
export function maskBankAccount(accountNumber?: string | null): string {
  if (!accountNumber || typeof accountNumber !== 'string') return '';
  const clean = accountNumber.trim();
  if (clean.length <= 4) return '****';

  const last4 = clean.slice(-4);
  const stars = '*'.repeat(clean.length - 4);
  return `${stars}${last4}`;
}
