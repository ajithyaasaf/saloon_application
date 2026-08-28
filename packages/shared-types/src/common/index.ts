/**
 * Common API Response and Pagination DTO types used across all frontend applications.
 */

export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message?: string;
  data: T;
  meta?: ResponseMetadata;
  timestamp: string;
  requestId?: string;
}

export interface ResponseMetadata {
  pagination?: PaginationMeta;
  [key: string]: any;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginationQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc' | 'ASC' | 'DESC';
  search?: string;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
  value?: any;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  errorCode: string;
  message: string;
  details?: ApiErrorDetail[] | Record<string, any>;
  timestamp: string;
  path?: string;
  requestId?: string;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  formattedAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface DateRangeQuery {
  startDate?: string;
  endDate?: string;
}
