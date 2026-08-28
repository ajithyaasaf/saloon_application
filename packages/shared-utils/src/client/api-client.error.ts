import { ApiErrorDetail, ApiErrorResponse } from '@saloon/shared-types';

export class ApiClientError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details?: ApiErrorDetail[] | Record<string, any>;
  public readonly path?: string;
  public readonly requestId?: string;
  public readonly rawResponse?: any;

  constructor(payload: {
    message: string;
    statusCode: number;
    errorCode?: string;
    details?: ApiErrorDetail[] | Record<string, any>;
    path?: string;
    requestId?: string;
    rawResponse?: any;
  }) {
    super(payload.message);
    this.name = 'ApiClientError';
    this.statusCode = payload.statusCode;
    this.errorCode = payload.errorCode || 'UNKNOWN_ERROR';
    this.details = payload.details;
    this.path = payload.path;
    this.requestId = payload.requestId;
    this.rawResponse = payload.rawResponse;

    Object.setPrototypeOf(this, ApiClientError.prototype);
  }

  static fromApiResponse(response: ApiErrorResponse, statusCode: number): ApiClientError {
    return new ApiClientError({
      message: response.message || 'An unexpected error occurred',
      statusCode,
      errorCode: response.errorCode,
      details: response.details,
      path: response.path,
      requestId: response.requestId,
      rawResponse: response,
    });
  }
}
