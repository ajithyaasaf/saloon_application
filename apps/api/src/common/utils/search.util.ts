import { SearchDefinition, SearchMode } from '../types/search.type';
import { StringUtil } from './string.util';

/**
 * SearchUtil — Pure, framework-independent abstract SearchDefinition builder.
 *
 * Purpose: Search term sanitization and abstract SearchDefinition object construction.
 * Thread Safety: 100% Thread-Safe.
 * Mutability: Immutable — static pure methods (ADR-012).
 * Dependencies: StringUtil (for whitespace normalization).
 * Complexity: O(N) where N is search term length.
 *
 * SANITIZATION POLICY:
 * - Trims leading and trailing whitespace.
 * - Collapses repeated internal whitespace.
 * - Removes non-printable control characters (ASCII 0-31 & 127).
 * - PRESERVES UNICODE, EMOJI, AND CASE AS-IS.
 * - NEVER automatically lowercases (case-sensitivity/collation is a DB concern).
 *
 * REPOSITORY TRANSLATION PATTERN:
 * ```typescript
 * const searchDef = SearchUtil.buildSearchDefinition(query.q, ['name', 'phone']);
 * if (searchDef) {
 *   where.OR = searchDef.fields.map(field => ({
 *     [field]: { contains: searchDef.term, mode: 'insensitive' }
 *   }));
 * }
 * ```
 *
 * Architecture ref: Phase 9.1 §2 (SearchUtil)
 */
export class SearchUtil {
  /**
   * Cleans raw search terms by trimming, normalizing spaces, and removing control chars.
   * Preserves unicode & emojis. Does NOT convert casing.
   */
  public static sanitizeSearchTerm(rawTerm: string): string {
    if (typeof rawTerm !== 'string') {
      return '';
    }
    const normalized = StringUtil.normalizeWhitespace(rawTerm);
    // Remove non-printable control characters (ASCII 0-31 and DEL 127) while preserving unicode
    return normalized.replace(/[\x00-\x1F\x7F]/g, '');
  }

  /**
   * Builds an abstract `SearchDefinition<T>` object for repositories to translate.
   * Returns `undefined` if search term is empty or shorter than `minimumTermLength`.
   */
  public static buildSearchDefinition<T>(
    searchTerm: string | undefined,
    targetFields: (keyof T)[],
    mode: SearchMode = 'CONTAINS',
    minimumTermLength = 1,
  ): SearchDefinition<T> | undefined {
    if (!searchTerm || typeof searchTerm !== 'string' || !Array.isArray(targetFields) || targetFields.length === 0) {
      return undefined;
    }

    const term = SearchUtil.sanitizeSearchTerm(searchTerm);
    if (term.length < Math.max(1, minimumTermLength)) {
      return undefined;
    }

    return Object.freeze({
      term,
      fields: Object.freeze([...targetFields]) as unknown as (keyof T)[],
      mode,
      minimumTermLength,
    });
  }
}
