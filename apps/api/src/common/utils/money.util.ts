import { ValidationException } from '../exceptions/validation.exception';

/**
 * Breakdown of monetary split into commission, tax, and net payout.
 */
export interface TaxCommissionBreakdown {
  totalSubunits: number;
  commissionSubunits: number;
  taxSubunits: number;
  netSubunits: number;
}

/**
 * MoneyUtil — Monetary calculations using integer subunits (paise for INR).
 *
 * Purpose: Safe, precise monetary math using integer subunits and Banker's rounding.
 * Thread Safety: 100% Thread-Safe.
 * Mutability: Immutable — static pure methods (ADR-012).
 * Dependencies: ValidationException (for parameter boundary checks).
 * Complexity: O(1) for arithmetic; O(N) for weighted allocation.
 *
 * Invariant: All methods except `toSubunits()` accept ONLY integer subunits.
 * Floating-point numbers are strictly forbidden in subunit parameters.
 *
 * Architecture ref: Phase 9.1 §2 (MoneyUtil)
 */
export class MoneyUtil {
  /**
   * Converts floating-point units (e.g. ₹125.50) to integer subunits (12550 paise).
   * Uses Banker's Rounding for fractional paise.
   */
  public static toSubunits(rupees: number): number {
    if (!Number.isFinite(rupees)) {
      throw new ValidationException('MoneyUtil.toSubunits() requires a finite number');
    }
    return MoneyUtil.roundHalfEven(rupees * 100);
  }

  /**
   * Converts integer subunits (12550 paise) back to units (125.5).
   */
  public static toUnits(paise: number): number {
    MoneyUtil.assertIntegerSubunit(paise, 'toUnits');
    return paise / 100;
  }

  /**
   * Adds two subunit amounts (a + b).
   */
  public static add(aPaise: number, bPaise: number): number {
    MoneyUtil.assertIntegerSubunit(aPaise, 'add (param a)');
    MoneyUtil.assertIntegerSubunit(bPaise, 'add (param b)');
    return aPaise + bPaise;
  }

  /**
   * Subtracts subunit amounts (a - b).
   */
  public static subtract(aPaise: number, bPaise: number): number {
    MoneyUtil.assertIntegerSubunit(aPaise, 'subtract (param a)');
    MoneyUtil.assertIntegerSubunit(bPaise, 'subtract (param b)');
    return aPaise - bPaise;
  }

  /**
   * Calculates percentage of a subunit amount using Half-Even Rounding.
   * Throws ValidationException if percentage < 0 or percentage > 100.
   */
  public static calculatePercentage(subunits: number, percentage: number): number {
    MoneyUtil.assertIntegerSubunit(subunits, 'calculatePercentage');
    MoneyUtil.assertValidPercentage(percentage, 'calculatePercentage');

    const rawResult = (subunits * percentage) / 100;
    return MoneyUtil.roundHalfEven(rawResult);
  }

  /**
   * Computes platform commission and GST tax split on a total transaction amount.
   *
   * @param totalSubunits - Total customer payment in paise.
   * @param commissionPercent - Platform commission % (0 to 100).
   * @param taxPercent - Tax % applied on commission (0 to 100).
   */
  public static calculateTaxAndCommission(
    totalSubunits: number,
    commissionPercent: number,
    taxPercent: number,
  ): TaxCommissionBreakdown {
    MoneyUtil.assertIntegerSubunit(totalSubunits, 'calculateTaxAndCommission');
    MoneyUtil.assertValidPercentage(commissionPercent, 'calculateTaxAndCommission (commissionPercent)');
    MoneyUtil.assertValidPercentage(taxPercent, 'calculateTaxAndCommission (taxPercent)');

    const commissionSubunits = MoneyUtil.calculatePercentage(totalSubunits, commissionPercent);
    const taxSubunits = MoneyUtil.calculatePercentage(commissionSubunits, taxPercent);
    const netSubunits = totalSubunits - (commissionSubunits + taxSubunits);

    return Object.freeze({
      totalSubunits,
      commissionSubunits,
      taxSubunits,
      netSubunits,
    });
  }

  /**
   * Safely splits money across multiple recipients according to weights while guaranteeing:
   * sum(allocations) === totalSubunits
   *
   * @param totalSubunits - Total integer subunits to distribute.
   * @param weights - Array of non-negative numeric weights.
   */
  public static allocate(totalSubunits: number, weights: number[]): number[] {
    MoneyUtil.assertIntegerSubunit(totalSubunits, 'allocate');
    if (!Array.isArray(weights) || weights.length === 0) {
      throw new ValidationException('MoneyUtil.allocate() requires a non-empty weights array');
    }

    const totalWeight = weights.reduce((acc, w) => {
      if (!Number.isFinite(w) || w < 0) {
        throw new ValidationException('MoneyUtil.allocate() weights must be non-negative finite numbers');
      }
      return acc + w;
    }, 0);

    if (totalWeight === 0) {
      throw new ValidationException('MoneyUtil.allocate() total weight cannot be zero');
    }

    let remainder = totalSubunits;
    const allocations: number[] = [];
    const fractionalParts: { index: number; fraction: number }[] = [];

    for (let i = 0; i < weights.length; i++) {
      const exactShare = (totalSubunits * weights[i]) / totalWeight;
      const share = Math.floor(exactShare);
      allocations[i] = share;
      remainder -= share;
      fractionalParts.push({ index: i, fraction: exactShare - share });
    }

    // Distribute 1-paise remainder to items with highest fractional remainder
    fractionalParts.sort((a, b) => b.fraction - a.fraction);
    for (let i = 0; i < remainder; i++) {
      allocations[fractionalParts[i].index] += 1;
    }

    return Object.freeze(allocations) as unknown as number[];
  }

  /**
   * Formats integer subunits into Indian Currency display format (`₹1,250.00`).
   */
  public static formatInr(subunits: number): string {
    MoneyUtil.assertIntegerSubunit(subunits, 'formatInr');
    const units = MoneyUtil.toUnits(subunits);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(units);
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  /**
   * Enforces integer subunit invariant. Throws ValidationException on non-integers.
   */
  private static assertIntegerSubunit(value: number, methodName: string): void {
    if (!Number.isInteger(value)) {
      throw new ValidationException(
        `MoneyUtil.${methodName}() received non-integer subunit value '${value}'. Subunits must be whole integers.`,
      );
    }
  }

  /**
   * Enforces 0..100 percentage bound. Throws ValidationException on invalid values.
   */
  private static assertValidPercentage(percentage: number, methodName: string): void {
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      throw new ValidationException(
        `MoneyUtil.${methodName}() percentage must be between 0 and 100. Received: ${percentage}`,
      );
    }
  }

  /**
   * Implements Half-Even Rounding (Banker's Rounding) to eliminate statistical bias.
   * If fractional part is exactly 0.5, rounds to nearest even integer.
   */
  private static roundHalfEven(value: number): number {
    const floor = Math.floor(value);
    const decimal = value - floor;

    if (Math.abs(decimal - 0.5) < 1e-9) {
      return floor % 2 === 0 ? floor : floor + 1;
    }

    return Math.round(value);
  }
}
