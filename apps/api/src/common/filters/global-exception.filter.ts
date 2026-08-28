import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainException } from '../exceptions/domain.exception';
import { Prisma } from '@prisma/client';

/**
 * GlobalExceptionFilter — catches ALL exceptions and normalizes them into
 * the standard API error envelope defined in Phase 5 §8.2.
 *
 * Error envelope shape:
 * {
 *   "success": false,
 *   "error": {
 *     "code": "MACHINE_READABLE_CODE",
 *     "message": "Human readable message",
 *     "details": [],
 *     "requestId": "uuid",
 *     "timestamp": "ISO8601"
 *   }
 * }
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Extract requestId set by RequestIdMiddleware
    const requestId =
      (request.headers['x-request-id'] as string) ?? 'unknown';

    const timestamp = new Date().toISOString();

    // ─── Domain exceptions (business errors with machine-readable codes) ───────
    if (exception instanceof DomainException) {
      const body = exception.getResponse() as { code: string; message: string };
      response.status(exception.getStatus()).json({
        success: false,
        error: {
          code: body.code,
          message: body.message,
          details: [],
          requestId,
          timestamp,
        },
      });
      return;
    }

    // ─── Prisma known errors ──────────────────────────────────────────────────
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const { status, code, message } =
        this.mapPrismaError(exception);
      response.status(status).json({
        success: false,
        error: { code, message, details: [], requestId, timestamp },
      });
      return;
    }

    // ─── NestJS HTTP exceptions (ValidationPipe, @nestjs/passport, Throttler, etc.) ─────
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      let code = status === HttpStatus.TOO_MANY_REQUESTS ? 'RATE_LIMIT_EXCEEDED' : 'HTTP_EXCEPTION';
      let message = exception.message;
      let details: unknown[] = [];

      if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;
        code = (b['error'] as string) ?? code;
        message = (b['message'] as string) ?? message;
        // ValidationPipe puts field errors in message array
        if (Array.isArray(b['message'])) {
          details = b['message'] as unknown[];
          message = 'Validation failed';
          code = 'VALIDATION_ERROR';
        }
      }

      response.status(status).json({
        success: false,
        error: { code, message, details, requestId, timestamp },
      });
      return;
    }

    // ─── Unexpected / unhandled errors ────────────────────────────────────────
    const isDev = process.env.NODE_ENV !== 'production';
    const errMessage = exception instanceof Error ? exception.message : String(exception);
    const errStack = exception instanceof Error ? exception.stack : undefined;

    this.logger.error(
      `Unhandled exception on ${request.method} ${request.url}: ${errMessage}`,
      errStack,
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred. Please try again later.',
        details: [],
        requestId,
        timestamp,
      },
    });
  }

  /**
   * Maps Prisma error codes to HTTP status and machine-readable codes.
   * Architecture ref: Phase 5 §8.3
   */
  private mapPrismaError(error: Prisma.PrismaClientKnownRequestError): {
    status: number;
    code: string;
    message: string;
  } {
    switch (error.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          code: 'UNIQUE_CONSTRAINT_VIOLATION',
          message: 'A record with this value already exists.',
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          code: 'RECORD_NOT_FOUND',
          message: 'The requested record was not found.',
        };
      case 'P2003':
        return {
          status: HttpStatus.CONFLICT,
          code: 'FOREIGN_KEY_CONSTRAINT_VIOLATION',
          message: 'This operation violates a data relationship constraint.',
        };
      case 'P2014':
        return {
          status: HttpStatus.BAD_REQUEST,
          code: 'RELATION_VIOLATION',
          message: 'The required relation does not exist.',
        };
      default:
        this.logger.error(`Unhandled Prisma error code: ${error.code}`, error.message);
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          code: 'DATABASE_ERROR',
          message: 'A database error occurred.',
        };
    }
  }
}
