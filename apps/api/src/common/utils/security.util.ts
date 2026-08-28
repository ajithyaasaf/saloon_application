import { createHash, randomBytes, timingSafeEqual as cryptoTimingSafeEqual } from 'crypto';

/**
 * SecurityUtil — Pure cryptographic hashing, constant-time comparison, random generation, and token masking.
 *
 * Thread Safety: 100% Thread-Safe.
 * Determinism: sha256 & timingSafeEqual are Deterministic; token/password generation is Non-Deterministic.
 * Time Complexity: O(N) where N is input byte length.
 * Space Complexity: O(N).
 * Dependencies: Node.js native `crypto` module.
 *
 * CRITICAL SECURITY NOTICE:
 * `sha256()` is NOT for password hashing.
 * User passwords MUST always be hashed using bcrypt or Argon2 with salt.
 * `sha256()` is reserved strictly for lookup tokens, email verification signatures, cache keys, and integrity verification.
 *
 * Architecture ref: Phase 9.1 §2 (SecurityUtil)
 */
export class SecurityUtil {
  /**
   * Computes SHA-256 hex digest of input string.
   * NOT FOR PASSWORDS (use bcrypt).
   */
  public static sha256(data: string): string {
    if (typeof data !== 'string') {
      return '';
    }
    return createHash('sha256').update(data, 'utf8').digest('hex');
  }

  /**
   * Constant-time string comparison to prevent timing side-channel attacks on tokens or hashes.
   */
  public static timingSafeEqual(a: string, b: string): boolean {
    if (typeof a !== 'string' || typeof b !== 'string') {
      return false;
    }
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');

    if (bufA.length !== bufB.length) {
      return false;
    }

    return cryptoTimingSafeEqual(bufA, bufB);
  }

  /**
   * Generates a cryptographically secure random hex token string of specified character length.
   */
  public static generateRandomToken(length = 32): string {
    const numBytes = Math.max(16, Math.ceil(length / 2));
    return randomBytes(numBytes).toString('hex').slice(0, length);
  }

  /**
   * Generates a cryptographically secure random password containing uppercase, lowercase, numbers, and special characters.
   * Useful for temporary staff passwords, admin creation, and invitation workflows.
   */
  public static generateSecurePassword(length = 16): string {
    const minLength = Math.max(12, length);
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghijkmnopqrstuvwxyz';
    const numbers = '23456789';
    const special = '!@#$%^&*()_+-=';
    const allChars = uppercase + lowercase + numbers + special;

    const bytes = randomBytes(minLength);
    const chars: string[] = [
      uppercase[bytes[0] % uppercase.length],
      lowercase[bytes[1] % lowercase.length],
      numbers[bytes[2] % numbers.length],
      special[bytes[3] % special.length],
    ];

    for (let i = 4; i < minLength; i++) {
      chars.push(allChars[bytes[i] % allChars.length]);
    }

    // Shuffle characters using Fisher-Yates with crypto random bytes
    const shuffleBytes = randomBytes(minLength);
    for (let i = chars.length - 1; i > 0; i--) {
      const j = shuffleBytes[i] % (i + 1);
      const temp = chars[i];
      chars[i] = chars[j];
      chars[j] = temp;
    }

    return chars.join('');
  }

  /**
   * Generates a cryptographically secure numeric OTP string (default 6 digits).
   */
  public static generateNumericOtp(digits = 6): string {
    const numDigits = Math.max(4, Math.min(10, digits));
    const min = Math.pow(10, numDigits - 1);
    const max = Math.pow(10, numDigits) - 1;

    const randomVal = randomBytes(4).readUInt32BE(0);
    const otpNumber = min + (randomVal % (max - min + 1));
    return String(otpNumber);
  }

  /**
   * Masks sensitive token or API key for safe logging (e.g. `sk_live_...4a2b`).
   */
  public static maskToken(token: string, visiblePrefix = 4, visibleSuffix = 4): string {
    if (typeof token !== 'string' || token.length === 0) {
      return '***';
    }
    if (token.length <= visiblePrefix + visibleSuffix) {
      return '*'.repeat(token.length);
    }
    const prefix = token.slice(0, visiblePrefix);
    const suffix = token.slice(-visibleSuffix);
    const maskedLength = token.length - (visiblePrefix + visibleSuffix);
    return `${prefix}${'*'.repeat(Math.min(16, maskedLength))}${suffix}`;
  }
}
