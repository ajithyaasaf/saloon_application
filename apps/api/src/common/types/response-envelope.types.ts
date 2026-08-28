import { PaginationMeta } from './paginated.types';

export interface ResponseMeta {
  requestId: string;
  timestamp: string;
  pagination?: PaginationMeta;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta: ResponseMeta;
}

export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details: ApiErrorDetail[];
  requestId: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorBody;
}
