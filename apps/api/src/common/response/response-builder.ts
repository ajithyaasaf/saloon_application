import { PaginationMeta } from '../types/pagination.type';
import {
  ApiErrorEnvelope,
  ApiMessageEnvelope,
  ApiNoContentEnvelope,
  ApiPaginatedEnvelope,
  ApiResponseEnvelope,
  ErrorDetail,
} from './api-response.interface';

/**
 * ResponseBuilder — Pure, stateless static envelope factory for HTTP responses.
 *
 * All returned top-level envelope objects are deeply immutable (`Object.freeze()`).
 *
 * Architecture ref: Phase 9.1 §2 & §5
 */
export class ResponseBuilder {
  /**
   * Constructs a single resource success envelope (HTTP 200).
   */
  public static success<T>(data: T, requestId?: string): ApiResponseEnvelope<T> {
    return Object.freeze({
      success: true,
      data,
      meta: Object.freeze({
        timestamp: new Date().toISOString(),
        ...(requestId ? { requestId } : {}),
      }),
    });
  }

  /**
   * Constructs a single resource creation success envelope (HTTP 201).
   */
  public static created<T>(data: T, requestId?: string): ApiResponseEnvelope<T> {
    return Object.freeze({
      success: true,
      data,
      meta: Object.freeze({
        timestamp: new Date().toISOString(),
        ...(requestId ? { requestId } : {}),
      }),
    });
  }

  /**
   * Constructs a paginated list success envelope (HTTP 200).
   */
  public static paginated<T>(
    data: T[],
    pagination: PaginationMeta,
    requestId?: string,
  ): ApiPaginatedEnvelope<T> {
    return Object.freeze({
      success: true,
      data,
      meta: Object.freeze({
        timestamp: new Date().toISOString(),
        pagination,
        ...(requestId ? { requestId } : {}),
      }),
    });
  }

  /**
   * Constructs a simple message envelope.
   */
  public static message(msg: string, requestId?: string): ApiMessageEnvelope {
    return Object.freeze({
      success: true,
      data: Object.freeze({ message: msg }),
      meta: Object.freeze({
        timestamp: new Date().toISOString(),
        ...(requestId ? { requestId } : {}),
      }),
    });
  }

  /**
   * Constructs an HTTP 204 No Content response representation.
   */
  public static noContent(requestId?: string): ApiNoContentEnvelope {
    return Object.freeze({
      success: true,
      data: null,
      meta: Object.freeze({
        timestamp: new Date().toISOString(),
        ...(requestId ? { requestId } : {}),
      }),
    });
  }

  /**
   * Constructs a standardized error envelope.
   */
  public static error(
    code: string,
    message: string,
    details?: ErrorDetail[],
    requestId?: string,
    traceId?: string,
  ): ApiErrorEnvelope {
    return Object.freeze({
      success: false,
      error: Object.freeze({
        code,
        message,
        details: Object.freeze(details ?? []) as ErrorDetail[],
      }),
      meta: Object.freeze({
        timestamp: new Date().toISOString(),
        ...(requestId ? { requestId } : {}),
        ...(traceId ? { traceId } : {}),
      }),
    });
  }
}
