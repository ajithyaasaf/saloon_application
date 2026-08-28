import { SortDefinition, SortDirection } from '../types/sort.type';

/**
 * SortUtil — Pure, framework-independent abstract SortDefinition array builder.
 *
 * Purpose: Validates requested sort fields against an allowlist and constructs multi-column SortDefinition[] specifications.
 * Thread Safety: 100% Thread-Safe.
 * Mutability: Immutable — static pure methods return frozen arrays & objects (ADR-012).
 * Dependencies: None.
 * Complexity: O(K) where K is number of allowed fields.
 *
 * FAULT TOLERANCE POLICY:
 * - When invalid or unallowed sort fields are supplied, SortUtil ALWAYS falls back to `defaultField`.
 * - Never throws exceptions for unsupported sort fields.
 *
 * REPOSITORY TRANSLATION PATTERN:
 * ```typescript
 * const sortDefs = SortUtil.buildSortDefinitions(query.sortBy, query.sortDir, ['name', 'price'], 'createdAt');
 * const orderBy = sortDefs.map(s => ({ [s.field]: s.direction }));
 * ```
 *
 * Architecture ref: Phase 9.1 §2 (SortUtil)
 */
export class SortUtil {
  /**
   * Sanitizes direction string into 'asc' or 'desc' (defaults to fallback direction).
   */
  public static normalizeDirection(dir?: string, fallback: SortDirection = 'desc'): SortDirection {
    if (typeof dir !== 'string') {
      return fallback;
    }
    const normalized = dir.trim().toLowerCase();
    return normalized === 'asc' ? 'asc' : 'desc';
  }

  /**
   * Builds an abstract `SortDefinition<T>[]` array specification for repositories to translate.
   * If `sortBy` is valid and present in `allowedFields`, returns that field sort.
   * Fault-tolerant Fallback: Returns `[ { field: defaultField, direction: defaultDir } ]`.
   */
  public static buildSortDefinitions<T>(
    sortBy: string | undefined,
    sortDir: SortDirection | undefined,
    allowedFields: (keyof T)[],
    defaultField: keyof T,
    defaultDir: SortDirection = 'desc',
    nulls?: 'first' | 'last',
  ): SortDefinition<T>[] {
    const direction = SortUtil.normalizeDirection(sortDir, defaultDir);

    if (
      typeof sortBy === 'string' &&
      Array.isArray(allowedFields) &&
      allowedFields.includes(sortBy as keyof T)
    ) {
      return Object.freeze([
        Object.freeze({
          field: sortBy as keyof T,
          direction,
          ...(nulls ? { nulls } : {}),
        }),
      ]) as unknown as SortDefinition<T>[];
    }

    return Object.freeze([
      Object.freeze({
        field: defaultField,
        direction: defaultDir,
        ...(nulls ? { nulls } : {}),
      }),
    ]) as unknown as SortDefinition<T>[];
  }
}
