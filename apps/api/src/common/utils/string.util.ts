/**
 * StringUtil — Pure string manipulations, case conversions, and template interpolation.
 *
 * Purpose: Safe string truncation, casing conversion, whitespace normalization, and template interpolation.
 * Thread Safety: 100% Thread-Safe.
 * Mutability: Immutable — static pure methods (ADR-012).
 * Dependencies: None.
 * Complexity: O(N) where N is string length.
 *
 * Architecture ref: Phase 9.1 §2 (StringUtil)
 */
export class StringUtil {
  /**
   * Normalizes whitespace by trimming leading/trailing spaces and collapsing repeated internal spaces.
   * e.g. '  hello   world  ' -> 'hello world'
   */
  public static normalizeWhitespace(str: string): string {
    if (typeof str !== 'string') {
      return '';
    }
    return str.trim().replace(/\s+/g, ' ');
  }

  /**
   * Safely truncates a string to maxLength, appending a suffix if truncated.
   */
  public static truncate(str: string, maxLength: number, suffix = '...'): string {
    if (typeof str !== 'string' || str.length <= maxLength) {
      return str ?? '';
    }
    const max = Math.max(0, maxLength - suffix.length);
    return str.slice(0, max) + suffix;
  }

  /**
   * Converts kebab-case, snake_case, or space-separated strings to camelCase.
   */
  public static toCamelCase(str: string): string {
    if (typeof str !== 'string') {
      return '';
    }
    return str
      .trim()
      .replace(/[-_ ]+(\w)/g, (_, letter: string) => letter.toUpperCase())
      .replace(/^[A-Z]/, (first: string) => first.toLowerCase());
  }

  /**
   * Converts camelCase, kebab-case, or space-separated strings to snake_case.
   */
  public static toSnakeCase(str: string): string {
    if (typeof str !== 'string') {
      return '';
    }
    return str
      .trim()
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/[- ]+/g, '_')
      .toLowerCase();
  }

  /**
   * Replaces Mustache-style placeholders `{{key}}` in a template with matching variables.
   */
  public static interpolate(template: string, variables: Record<string, string>): string {
    if (typeof template !== 'string') {
      return '';
    }
    if (!variables || typeof variables !== 'object') {
      return template;
    }
    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
      return Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] : match;
    });
  }

  /**
   * HTML entity map for escaping user inputs
   */
  private static readonly HTML_ESCAPE_MAP: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;',
    '/': '&#x2F;',
  };

  /**
   * Escapes dangerous HTML characters to prevent Cross-Site Scripting (XSS).
   */
  public static escapeHtml(str: string): string {
    if (typeof str !== 'string') {
      return '';
    }
    return str.replace(/[&<>"'`/]/g, (match) => StringUtil.HTML_ESCAPE_MAP[match] || match);
  }

  /**
   * Strips all HTML tags, script elements, and style blocks to produce pure safe text.
   */
  public static stripHtml(str: string): string {
    if (typeof str !== 'string') {
      return '';
    }
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim()
      .replace(/\s+/g, ' ');
  }

  /**
   * Cleans free text: removes non-printable control characters, strips HTML/scripts, normalizes whitespace, and truncates if maxLength provided.
   */
  public static sanitizeText(str: string, maxLength?: number): string {
    if (typeof str !== 'string') {
      return '';
    }
    let cleaned = StringUtil.stripHtml(str);
    cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');
    cleaned = StringUtil.normalizeWhitespace(cleaned);
    if (maxLength && maxLength > 0) {
      cleaned = StringUtil.truncate(cleaned, maxLength);
    }
    return cleaned;
  }
}
