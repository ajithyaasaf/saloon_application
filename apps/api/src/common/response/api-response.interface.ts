import { PaginationMeta } from '../types/pagination.type';

/**
 * Common response metadata present on all API envelopes.
 */
export interface ResponseMeta {
  requestId?: string;
  timestamp: string;
  pagination?: PaginationMeta;
}

/**
 * Single entity success response envelope.
 */
export interface ApiResponseEnvelope<T> {
  success: true;
  data: T;
  meta: ResponseMeta;
}

/**
 * Paginated list success response envelope.
 */
export interface ApiPaginatedEnvelope<T> {
  success: true;
  data: T[];
  meta: ResponseMeta & { pagination: PaginationMeta };
}

/**
 * Simple message response envelope (e.g. password reset requested).
 */
export interface ApiMessageEnvelope {
  success: true;
  data: { message: string };
  meta: ResponseMeta;
}

/**
 * HTTP 204 No Content response envelope representation.
 */
export interface ApiNoContentEnvelope {
  success: true;
  data: null;
  meta: ResponseMeta;
}

/**
 * Error detail payload for field validation errors.
 */
export interface ErrorDetail {
  field?: string;
  issue: string;
}

/**
 * Standard error response envelope.
 */
export interface ApiErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details: ErrorDetail[];
  };
  meta: ResponseMeta & { traceId?: string };
}
