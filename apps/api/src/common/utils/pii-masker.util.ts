/**
 * PiiMaskerUtil — Pure Personally Identifiable Information (PII) masking utility.
 *
 * Thread Safety: 100% Thread-Safe.
 * Determinism: Deterministic.
 * Time Complexity: O(N) where N is string length.
 * Space Complexity: O(N).
 * Dependencies: None.
 *
 * Architecture ref: Phase 9.1 §2 (PIIMaskerUtil)
 */
export class PiiMaskerUtil {
  /**
   * Masks email address leaving first letter of local-part and domain intact.
   * e.g. 'priya.sharma@example.com' -> 'p***a@example.com'
   */
  public static maskEmail(email: string): string {
    if (typeof email !== 'string' || !email.includes('@')) {
      return '***@***.***';
    }
    const [local, domain] = email.trim().split('@');
    if (local.length <= 2) {
      return `${local[0] ?? '*'}*@${domain}`;
    }
    const firstChar = local[0];
    const lastChar = local[local.length - 1];
    return `${firstChar}***${lastChar}@${domain}`;
  }

  /**
   * Masks Indian mobile phone numbers keeping country prefix (+91) and last 4 digits visible.
   * e.g. '+919876543210' -> '+91******3210'
   */
  public static maskPhone(phone: string): string {
    if (typeof phone !== 'string') {
      return '**********';
    }
    const clean = phone.trim();
    if (clean.length <= 4) {
      return '*'.repeat(clean.length);
    }
    const visibleSuffix = clean.slice(-4);
    const prefix = clean.startsWith('+91') ? '+91' : clean.slice(0, Math.min(2, clean.length - 4));
    return `${prefix}${'*'.repeat(Math.max(4, clean.length - prefix.length - 4))}${visibleSuffix}`;
  }

  /**
   * Masks person name by preserving first character of each word.
   * e.g. 'Priya Sharma' -> 'P**** S*****'
   */
  public static maskName(name: string): string {
    if (typeof name !== 'string' || name.trim().length === 0) {
      return '***';
    }
    return name
      .trim()
      .split(/\s+/)
      .map((part) => {
        if (part.length <= 1) {
          return '*';
        }
        return `${part[0]}${'*'.repeat(part.length - 1)}`;
      })
      .join(' ');
  }

  // ─── Reserved Maskers for Compliance Expansion ────────────────────────────

  /** Reserved masker signature for physical street address */
  public static maskAddress(address: string): string {
    if (typeof address !== 'string' || address.trim().length === 0) return '***';
    return `${address.trim().slice(0, 3)}***`;
  }

  /** Reserved masker signature for Indian GSTIN (27AAAAA****A1Z5) */
  public static maskGSTIN(gstin: string): string {
    if (typeof gstin !== 'string' || gstin.trim().length < 15) return '***************';
    const clean = gstin.trim();
    return `${clean.slice(0, 7)}****${clean.slice(11)}`;
  }

  /** Reserved masker signature for Bank Account Number (e.g. ******1234) */
  public static maskBankAccount(accountNumber: string): string {
    if (typeof accountNumber !== 'string' || accountNumber.trim().length < 4) return '****';
    const clean = accountNumber.trim();
    return `${'*'.repeat(Math.max(4, clean.length - 4))}${clean.slice(-4)}`;
  }
}
