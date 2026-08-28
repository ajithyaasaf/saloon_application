/**
 * SearchMode — Supported search matching strategies.
 *
 * Architecture ref: Phase 9.1 §2 (SearchUtil)
 */
export type SearchMode = 'EXACT' | 'PREFIX' | 'CONTAINS';

/**
 * SearchDefinition — Framework-agnostic abstract search specification.
 * Constructed by SearchUtil in the common layer and translated by Repositories.
 */
export interface SearchDefinition<T> {
  /** Cleaned, sanitized search term string */
  term: string;
  /** Allowlisted entity fields to search across */
  fields: (keyof T)[];
  /** Matching strategy mode (defaults to CONTAINS) */
  mode: SearchMode;
  /** Optional minimum search term length threshold */
  minimumTermLength?: number;
}
