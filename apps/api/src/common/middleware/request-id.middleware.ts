import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * RequestIdMiddleware — generates a unique UUID per request and attaches it
 * to both the request object and the response header.
 *
 * If the upstream proxy (Nginx, Cloudflare) already sent an `x-request-id`
 * header, that value is preserved. Otherwise a new UUID is generated.
 *
 * Architecture ref: Phase 5 §9.3 (Log Correlation).
 * The requestId is used by LoggingInterceptor and GlobalExceptionFilter
 * to correlate all logs and error responses for the same request.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestIdMiddleware.name);

  use(req: Request, res: Response, next: NextFunction): void {
    const existingId = req.headers['x-request-id'] as string | undefined;
    const requestId = existingId ?? uuidv4();

    // Attach to request for downstream handlers
    req.headers['x-request-id'] = requestId;

    // Echo back in the response for client-side correlation
    res.setHeader('x-request-id', requestId);

    next();
  }
}
