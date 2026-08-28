import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  RequestTimeoutException,
} from '@nestjs/common';
import { Observable, TimeoutError, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

export const DEFAULT_TIMEOUT_MS = 15000;

/**
 * TimeoutInterceptor — cancels requests exceeding timeout limit and throws RequestTimeoutException (408).
 *
 * Architecture ref: Phase 9.1 §2 (TimeoutInterceptor)
 */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      timeout(this.timeoutMs),
      catchError((err: unknown) => {
        if (err instanceof TimeoutError) {
          return throwError(() => new RequestTimeoutException('Request processing timed out. Please retry.'));
        }
        return throwError(() => err);
      }),
    );
  }
}
