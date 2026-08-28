import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * TransformInterceptor — wraps all successful responses in the standard
 * API response envelope defined in Phase 5 §7.3.
 *
 * Successful envelope:
 * {
 *   "success": true,
 *   "data": { ... },
 *   "meta": {
 *     "requestId": "uuid",
 *     "timestamp": "ISO8601"
 *   }
 * }
 *
 * Paginated responses: the service must return
 * { data: [...], pagination: {...} } and this interceptor will
 * promote `pagination` into the `meta` object.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, unknown> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<unknown> {
    const httpCtx = context.switchToHttp();
    const request = httpCtx?.getRequest?.<Request>() ?? ({} as Request);
    const response = typeof httpCtx?.getResponse === 'function' ? httpCtx.getResponse<Response>() : undefined;
    const requestId =
      (request?.headers?.['x-request-id'] as string) ?? 'unknown';

    // Prevent sensitive API response caching on intermediate proxies and shared caches if not explicitly overridden
    if (response && typeof response.getHeader === 'function' && typeof response.setHeader === 'function') {
      if (!response.getHeader('Cache-Control')) {
        response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        response.setHeader('Pragma', 'no-cache');
      }
    }

    return next.handle().pipe(
      map((responseData) => {
        // If responseData is already an API envelope (e.g. from ResponseBuilder), preserve top-level structure
        if (
          responseData !== null &&
          typeof responseData === 'object' &&
          'success' in (responseData as object) &&
          'data' in (responseData as object)
        ) {
          const envelope = responseData as unknown as {
            success: boolean;
            data: unknown;
            meta?: Record<string, unknown>;
          };
          return {
            success: envelope.success ?? true,
            data: envelope.data,
            meta: {
              requestId,
              timestamp: new Date().toISOString(),
              ...(envelope.meta || {}),
            },
          };
        }

        // If the service returns an object with { data, pagination }, split them
        if (
          responseData !== null &&
          typeof responseData === 'object' &&
          'data' in (responseData as object) &&
          'pagination' in (responseData as object)
        ) {
          const { data, pagination } = responseData as unknown as {
            data: unknown;
            pagination: unknown;
          };
          return {
            success: true,
            data,
            meta: {
              requestId,
              timestamp: new Date().toISOString(),
              pagination,
            },
          };
        }

        return {
          success: true,
          data: responseData,
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
      }),
    );
  }
}
