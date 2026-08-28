import { FilterCondition } from '../types/filter.type';
import { DateTimeUtil } from './date-time.util';
import { NumberUtil } from './number.util';

/**
 * FilterUtil — Pure, framework-independent abstract FilterCondition builder.
 *
 * Purpose: Constructs abstract, ORM-agnostic filter condition objects for Repositories to translate.
 * Thread Safety: 100% Thread-Safe.
 * Mutability: Immutable — static pure methods return frozen objects (ADR-012).
 * Dependencies: DateTimeUtil (for date parsing), NumberUtil (for number checks).
 * Complexity: O(1) for all methods.
 *
 * REPOSITORY TRANSLATION PATTERN:
 * ```typescript
 * const dateFilter = FilterUtil.buildDateRangeFilter(from, to);
 * if (dateFilter) {
 *   where.createdAt = { gte: dateFilter.gte, lte: dateFilter.lte };
 * }
 *
 * const roleFilter = FilterUtil.buildEnumFilter(roles);
 * if (roleFilter) {
 *   where.role = { in: roleFilter.values };
 * }
 * ```
 *
 * IMMUTABILITY GUARANTEE: FilterCondition outputs are deeply frozen (`Object.freeze()`).
 * Repositories MUST NEVER mutate received FilterCondition or FilterDefinition objects.
 *
 * Architecture ref: Phase 9.1 §2 (FilterUtil)
 */
export class FilterUtil {
  /**
   * Constructs an abstract `BETWEEN` date range condition (`gte`, `lte`).
   * Returns `undefined` if neither `from` nor `to` is provided.
   */
  public static buildDateRangeFilter(
    from?: Date | string,
    to?: Date | string,
  ): FilterCondition<'BETWEEN', Date> | undefined {
    if (!from && !to) {
      return undefined;
    }

    let gte: Date | undefined;
    let lte: Date | undefined;

    try {
      gte = from ? DateTimeUtil.parseDate(from) : undefined;
    } catch {
      gte = undefined;
    }

    try {
      lte = to ? DateTimeUtil.parseDate(to) : undefined;
    } catch {
      lte = undefined;
    }

    if (!gte && !lte) {
      return undefined;
    }

    return Object.freeze({
      operator: 'BETWEEN',
      ...(gte ? { gte } : {}),
      ...(lte ? { lte } : {}),
    });
  }

  /**
   * Constructs an abstract `IN` set inclusion filter condition for enum or primitive values.
   * Returns `undefined` if `values` array is empty or undefined.
   */
  public static buildEnumFilter<T>(values?: T[]): FilterCondition<'IN', T> | undefined {
    if (!Array.isArray(values) || values.length === 0) {
      return undefined;
    }

    const uniqueValues = Array.from(new Set(values));
    return Object.freeze({
      operator: 'IN',
      values: Object.freeze(uniqueValues) as unknown as T[],
    });
  }

  /**
   * Constructs an abstract `EQ` exact equality filter condition.
   * Returns `undefined` if value is null or undefined.
   */
  public static buildEqualsFilter<T>(value?: T): FilterCondition<'EQ', T> | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    return Object.freeze({
      operator: 'EQ',
      value,
    });
  }

  /**
   * Constructs an abstract `IS_NULL` or `NOT_NULL` filter condition.
   * Returns `undefined` if `isNull` boolean flag is undefined.
   */
  public static buildNullFilter(
    isNull?: boolean,
  ): FilterCondition<'IS_NULL' | 'NOT_NULL', boolean> | undefined {
    if (typeof isNull !== 'boolean') {
      return undefined;
    }

    return Object.freeze({
      operator: isNull ? 'IS_NULL' : 'NOT_NULL',
      value: isNull,
    });
  }

  /**
   * Constructs an abstract `BETWEEN`, `GTE`, or `LTE` numeric range filter condition.
   * Returns `undefined` if neither `min` nor `max` is a finite number.
   */
  public static buildRangeFilter(
    min?: number,
    max?: number,
  ): FilterCondition<'BETWEEN' | 'GTE' | 'LTE', number> | undefined {
    const hasMin = NumberUtil.isFiniteNumber(min);
    const hasMax = NumberUtil.isFiniteNumber(max);

    if (!hasMin && !hasMax) {
      return undefined;
    }

    const operator = hasMin && hasMax ? 'BETWEEN' : hasMin ? 'GTE' : 'LTE';

    return Object.freeze({
      operator,
      ...(hasMin ? { gte: min } : {}),
      ...(hasMax ? { lte: max } : {}),
    });
  }
}
