import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorDefinition } from '../error-codes/error-code.interface';

/**
 * BaseException — Abstract root exception for all custom platform exceptions.
 *
 * Extends NestJS `HttpException`. Carries a strongly-typed `code: string`,
 * UTC ISO `timestamp`, and optional structured `details?: unknown[]`.
 *
 * Architecture ref: Phase 9.1 §3
 */
export abstract class BaseException extends HttpException {
  public readonly code: string;
  public readonly timestamp: string;
  public readonly details: unknown[];

  constructor(
    errorDef: ErrorDefinition,
    customMessage?: string,
    details?: unknown[],
  ) {
    const timestamp = new Date().toISOString();
    const responsePayload = {
      code: errorDef.code,
      message: customMessage ?? errorDef.description,
      timestamp,
      details: details ?? [],
    };
    super(responsePayload, errorDef.status ?? HttpStatus.INTERNAL_SERVER_ERROR);
    this.code = errorDef.code;
    this.timestamp = timestamp;
    this.details = details ?? [];
  }
}
