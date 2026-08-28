import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';

/**
 * LoggingInterceptor — logs every HTTP request on completion.
 *
 * Log format (Phase 5 §9.2 - Request Logging):
 * { method, path, statusCode, durationMs, userId, requestId }
 *
 * Requests exceeding 2000ms are flagged at WARN level.
 * Normal requests are logged at INFO level.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse<Response>();
          const durationMs = Date.now() - startTime;
          const requestId = request.headers['x-request-id'] as string;

          const logData = {
            method,
            path: url,
            statusCode: response.statusCode,
            durationMs,
            requestId,
          };

          if (durationMs > 2000) {
            this.logger.warn(`SLOW REQUEST (${durationMs}ms) ${method} ${url}`, logData);
          } else {
            this.logger.log(`${method} ${url} ${response.statusCode} ${durationMs}ms`);
          }
        },
        error: () => {
          const durationMs = Date.now() - startTime;
          this.logger.error(`${method} ${url} FAILED ${durationMs}ms`);
        },
      }),
    );
  }
}
