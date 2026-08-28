/**
 * SortDirection — Ordering directions.
 */
export type SortDirection = 'asc' | 'desc';

/**
 * SortDefinition — Framework-agnostic abstract sort specification.
 * Supports multi-column ordering when used as an array `SortDefinition<T>[]`.
 *
 * Architecture ref: Phase 9.1 §2 (SortUtil)
 */
export interface SortDefinition<T> {
  field: keyof T;
  direction: SortDirection;
  /** Optional NULL ordering specification */
  nulls?: 'first' | 'last';
}
