/**
 * NumberUtil — Pure mathematical rounding, bounds clamping, and formatting utility.
 *
 * Purpose: Safe number rounding, bounds clamping, integer parsing, and type-guard checks.
 * Thread Safety: 100% Thread-Safe.
 * Mutability: Immutable — static pure methods (ADR-012).
 * Dependencies: None.
 * Complexity: O(1) for all methods.
 *
 * Note: Financial/monetary math must use MoneyUtil (ADR-011).
 *
 * Architecture ref: Phase 9.1 §2 (NumberUtil)
 */
export class NumberUtil {
  /**
   * Type-guard helper verifying if a value is a finite number.
   * Prevents repetitive `typeof v === 'number' && Number.isFinite(v)` checks.
   */
  public static isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }

  /**
   * Rounds a number to a specified number of decimal places.
   */
  public static roundTo(value: number, decimalPlaces: number): number {
    if (!NumberUtil.isFiniteNumber(value)) {
      return 0;
    }
    const factor = Math.pow(10, Math.max(0, decimalPlaces));
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  /**
   * Clamps a numeric value within min and max inclusive bounds.
   */
  public static clamp(value: number, min: number, max: number): number {
    if (!NumberUtil.isFiniteNumber(value)) {
      return min;
    }
    return Math.min(Math.max(value, min), max);
  }

  /**
   * Safely parses an unknown input to an integer with a fallback default.
   */
  public static safeParseInt(value: unknown, defaultValue = 0): number {
    if (NumberUtil.isFiniteNumber(value)) {
      return Math.floor(value);
    }
    if (typeof value === 'string') {
      const parsed = parseInt(value.trim(), 10);
      return isNaN(parsed) ? defaultValue : parsed;
    }
    return defaultValue;
  }

  /**
   * Formats a numeric value into a percentage string (e.g. 85.5%).
   */
  public static formatPercentage(value: number, decimalPlaces = 1): string {
    const rounded = NumberUtil.roundTo(value, decimalPlaces);
    return `${rounded}%`;
  }
}
