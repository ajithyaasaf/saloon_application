/**
 * NormalizedPagination — Sanitized pagination parameters.
 */
export interface NormalizedPagination {
  page: number;
  limit: number;
}

/**
 * PaginationMeta — Standard pagination metadata included in list responses.
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  /** Reserved optional estimated total for search engines or large table counts */
  estimatedTotal?: number;
}
