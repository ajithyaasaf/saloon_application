/**
 * SlugUtil — Pure URL slug generation, suffixing, and validation utility.
 *
 * Purpose: Title to slug transformation, slug validation, and slug suffixing.
 * Thread Safety: 100% Thread-Safe.
 * Mutability: Immutable — static pure methods (ADR-012).
 * Dependencies: None.
 * Complexity: O(N) where N is string length.
 *
 * Architecture ref: Phase 9.1 §2 (SlugUtil)
 */
export class SlugUtil {
  /**
   * Converts a title string into a lowercase, URL-safe slug.
   * Strips diacritics, non-alphanumeric characters, and collapses consecutive hyphens.
   *
   * Example: 'Glamour Salon & Spa!' -> 'glamour-salon-spa'
   */
  public static slugify(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    return input
      .normalize('NFD') // Decompose diacritical marks
      .replace(/[\u0300-\u036f]/g, '') // Strip diacritics (e.g. Priyá -> Priya)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric except spaces & hyphens
      .replace(/[\s_]+/g, '-') // Convert spaces & underscores to hyphens
      .replace(/-+/g, '-') // Collapse consecutive hyphens
      .replace(/^-+|-+$/g, ''); // Strip leading and trailing hyphens
  }

  /**
   * Appends a numeric or string suffix to a base slug for uniqueness handling.
   * Zero database logic — caller provides base slug and suffix.
   *
   * Example: appendSuffix('glamour-salon', 2) -> 'glamour-salon-2'
   */
  public static appendSuffix(slug: string, suffix: string | number): string {
    const cleanBase = SlugUtil.slugify(slug);
    const cleanSuffix = String(suffix).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!cleanSuffix) {
      return cleanBase;
    }
    return `${cleanBase}-${cleanSuffix}`;
  }

  /**
   * Validates if a string is a canonical URL slug (lowercase alphanumeric with hyphens).
   */
  public static isValidSlug(slug: string): boolean {
    if (typeof slug !== 'string' || slug.trim().length === 0) {
      return false;
    }
    const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    return SLUG_REGEX.test(slug);
  }
}
