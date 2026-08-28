import {
  addMinutes,
  areIntervalsOverlapping,
  differenceInYears,
  format,
  isAfter,
  isBefore,
  isWithinInterval,
  parseISO,
} from 'date-fns';

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/**
 * DateTimeUtil — Pure, timezone-aware date arithmetic and formatting utility.
 *
 * Purpose: Date manipulation, comparison, overlap detection, and formatting.
 * Thread Safety: 100% Thread-Safe.
 * Mutability: Immutable — static pure methods (ADR-012).
 * Dependencies: date-fns (pure wrappers).
 * Complexity: O(1) for all date operations.
 *
 * TIMEZONE POLICY:
 * - All business logic and internal calculations MUST be performed in UTC.
 * - Local timezones (e.g. Asia/Kolkata) are used strictly for UI display formatting.
 * - Never mix timezone offset conversion into date comparisons or slot logic.
 *
 * Input Standard: Every method accepting a date accepts `Date | string` and parses
 * it internally, returning a new `Date` instance (or boolean/string/number).
 *
 * Architecture ref: Phase 9.1 §2 (DateTimeUtil)
 */
export class DateTimeUtil {
  /**
   * Returns current timestamp in UTC.
   */
  public static nowUtc(): Date {
    return new Date();
  }

  /**
   * Standardizes input `Date | string` into a clean Date instance.
   * Throws RangeError for invalid date strings.
   */
  public static parseDate(dateInput: Date | string): Date {
    const parsed = typeof dateInput === 'string' ? parseISO(dateInput) : new Date(dateInput.getTime());
    if (isNaN(parsed.getTime())) {
      throw new RangeError(`DateTimeUtil.parseDate() received invalid date: '${dateInput}'`);
    }
    return parsed;
  }

  /**
   * Returns a new Date set to 00:00:00.000 for the given date in UTC.
   */
  public static toStartOfDay(dateInput: Date | string): Date {
    const d = DateTimeUtil.parseDate(dateInput);
    const start = new Date(d);
    start.setUTCHours(0, 0, 0, 0);
    return start;
  }

  /**
   * Returns a new Date set to 23:59:59.999 for the given date in UTC.
   */
  public static toEndOfDay(dateInput: Date | string): Date {
    const d = DateTimeUtil.parseDate(dateInput);
    const end = new Date(d);
    end.setUTCHours(23, 59, 59, 999);
    return end;
  }

  /**
   * Adds specified minutes to a date, returning a new Date.
   */
  public static addMinutes(dateInput: Date | string, minutes: number): Date {
    const d = DateTimeUtil.parseDate(dateInput);
    return addMinutes(d, minutes);
  }

  /**
   * Checks whether two dates fall on the same UTC calendar day.
   */
  public static isSameDay(dateA: Date | string, dateB: Date | string): boolean {
    const dA = DateTimeUtil.parseDate(dateA);
    const dB = DateTimeUtil.parseDate(dateB);
    return (
      dA.getUTCFullYear() === dB.getUTCFullYear() &&
      dA.getUTCMonth() === dB.getUTCMonth() &&
      dA.getUTCDate() === dB.getUTCDate()
    );
  }

  /**
   * Checks if a date is in the past relative to UTC now.
   */
  public static isPast(dateInput: Date | string): boolean {
    const d = DateTimeUtil.parseDate(dateInput);
    return isBefore(d, DateTimeUtil.nowUtc());
  }

  /**
   * Checks if a date is in the future relative to UTC now.
   */
  public static isFuture(dateInput: Date | string): boolean {
    const d = DateTimeUtil.parseDate(dateInput);
    return isAfter(d, DateTimeUtil.nowUtc());
  }

  /**
   * Checks whether two time intervals overlap (inclusive of boundary start/end).
   */
  public static areOverlapping(
    startA: Date | string,
    endA: Date | string,
    startB: Date | string,
    endB: Date | string,
  ): boolean {
    const sA = DateTimeUtil.parseDate(startA);
    const eA = DateTimeUtil.parseDate(endA);
    const sB = DateTimeUtil.parseDate(startB);
    const eB = DateTimeUtil.parseDate(endB);

    return areIntervalsOverlapping(
      { start: sA, end: eA },
      { start: sB, end: eB },
      { inclusive: true },
    );
  }

  /**
   * Checks whether a target timestamp falls within a start and end time range (inclusive).
   */
  public static isWithinRange(
    target: Date | string,
    start: Date | string,
    end: Date | string,
  ): boolean {
    const t = DateTimeUtil.parseDate(target);
    const s = DateTimeUtil.parseDate(start);
    const e = DateTimeUtil.parseDate(end);

    return isWithinInterval(t, { start: s, end: e });
  }

  /**
   * Computes age in full years from date of birth.
   */
  public static calculateAge(dateOfBirth: Date | string): number {
    const dob = DateTimeUtil.parseDate(dateOfBirth);
    const now = DateTimeUtil.nowUtc();
    return differenceInYears(now, dob);
  }

  /**
   * Formats date to canonical ISO 8601 string.
   */
  public static formatToIso(dateInput: Date | string): string {
    const d = DateTimeUtil.parseDate(dateInput);
    return d.toISOString();
  }

  /**
   * Formats date to a display pattern string (e.g. 'yyyy-MM-dd HH:mm:ss').
   */
  public static formatToDisplay(dateInput: Date | string, formatPattern: string): string {
    const d = DateTimeUtil.parseDate(dateInput);
    return format(d, formatPattern);
  }
}
