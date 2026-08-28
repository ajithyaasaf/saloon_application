import { NormalizedPagination, PaginationMeta } from '../types/pagination.type';
import { NumberUtil } from './number.util';

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/**
 * PaginationUtil — Pure, framework-independent pagination calculation utility.
 *
 * Purpose: Parameter normalization, skip/take bounds calculation, and pagination metadata generation.
 * Thread Safety: 100% Thread-Safe.
 * Mutability: Immutable — static pure methods (ADR-012).
 * Dependencies: NumberUtil (for bounds clamping & integer parsing).
 * Complexity: O(1) for all calculations.
 *
 * Architecture ref: Phase 9.1 §2 (PaginationUtil)
 */
export class PaginationUtil {
  /**
   * Normalizes raw query parameters into sanitized page and limit integers.
   * Clamps limit to `maxLimit` (default 100) and page to min 1.
   */
  public static normalizeParams(
    rawPage?: unknown,
    rawLimit?: unknown,
    maxLimit = MAX_LIMIT,
  ): NormalizedPagination {
    const pageParsed = NumberUtil.safeParseInt(rawPage, DEFAULT_PAGE);
    const limitParsed = NumberUtil.safeParseInt(rawLimit, DEFAULT_LIMIT);

    const page = Math.max(DEFAULT_PAGE, pageParsed);
    const limit = NumberUtil.clamp(limitParsed, 1, maxLimit);

    return Object.freeze({
      page,
      limit,
    });
  }

  /**
   * Computes database query offset (skip) and batch size (take).
   */
  public static getSkipTake(params: NormalizedPagination): { skip: number; take: number } {
    const page = Math.max(DEFAULT_PAGE, params.page ?? DEFAULT_PAGE);
    const limit = Math.max(1, params.limit ?? DEFAULT_LIMIT);

    const skip = (page - 1) * limit;
    const take = limit;

    return Object.freeze({ skip, take });
  }

  /**
   * Constructs standardized PaginationMeta object with totalPages, hasNext, and hasPrevious flags.
   */
  public static buildMeta(totalItems: number, params: NormalizedPagination): PaginationMeta {
    const total = Math.max(0, NumberUtil.safeParseInt(totalItems, 0));
    const page = Math.max(DEFAULT_PAGE, params.page ?? DEFAULT_PAGE);
    const limit = Math.max(1, params.limit ?? DEFAULT_LIMIT);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrevious = page > 1 && totalPages > 0;

    return Object.freeze({
      total,
      page,
      limit,
      totalPages,
      hasNext,
      hasPrevious,
    });
  }

  /**
   * Validates if a string is a valid base64/opaque cursor for future cursor-based pagination.
   * Reserved helper for future cursor pagination.
   */
  public static validateCursor(cursor?: string): boolean {
    if (typeof cursor !== 'string' || cursor.trim().length === 0) {
      return false;
    }
    // Opaque cursor validation (base64 or valid ID pattern)
    return cursor.trim().length <= 256;
  }
}
