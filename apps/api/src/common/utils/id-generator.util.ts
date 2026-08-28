import { randomBytes, randomUUID } from 'crypto';

/**
 * IdGeneratorUtil — Pure entity and transaction ID generation utility.
 *
 * Thread Safety: 100% Thread-Safe.
 * Determinism: Non-Deterministic.
 * Time Complexity: O(1) for ID generation.
 * Space Complexity: O(1).
 * Dependencies: Node.js native `crypto` module.
 *
 * INTENT & USAGE NOTICE:
 * Generated IDs are application entity identifiers (sal_, usr_, bkg_, pay_, etc.).
 * They are NOT cryptographic secrets, NOT password hashes, and NOT authentication tokens.
 *
 * Architecture ref: Phase 9.1 §2 (IdGeneratorUtil)
 */
export class IdGeneratorUtil {
  /**
   * Generates a prefixed ID string (e.g. `usr_4a2b9f8e12345678`).
   */
  public static generatePrefixedId(prefix: string, randomLength = 16): string {
    const cleanPrefix = typeof prefix === 'string' && prefix.trim().length > 0 ? `${prefix.trim().toLowerCase()}_` : '';
    const bytesCount = Math.max(8, Math.ceil(randomLength / 2));
    const randomPart = randomBytes(bytesCount).toString('hex').slice(0, randomLength);
    return `${cleanPrefix}${randomPart}`;
  }

  /**
   * Generates a unique Salon ID (`sal_...`).
   */
  public static generateSalonId(): string {
    return IdGeneratorUtil.generatePrefixedId('sal', 24);
  }

  /**
   * Generates a unique User ID (`usr_...`).
   */
  public static generateUserId(): string {
    return IdGeneratorUtil.generatePrefixedId('usr', 24);
  }

  /**
   * Generates a unique Booking ID (`bkg_...`).
   */
  public static generateBookingId(): string {
    return IdGeneratorUtil.generatePrefixedId('bkg', 24);
  }

  /**
   * Generates a unique Payment ID (`pay_...`).
   */
  public static generatePaymentId(): string {
    return IdGeneratorUtil.generatePrefixedId('pay', 24);
  }

  /**
   * Generates a unique Invoice ID (`inv_...`).
   */
  public static generateInvoiceId(): string {
    return IdGeneratorUtil.generatePrefixedId('inv', 24);
  }

  /**
   * Generates a canonical UUID v4 string.
   */
  public static generateUuid(): string {
    return randomUUID();
  }
}
