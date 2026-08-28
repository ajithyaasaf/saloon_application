import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { GlobalExceptionFilter } from '../global-exception.filter';
import { ValidationException } from '../../exceptions/validation.exception';
import { ERROR_CODES } from '../../error-codes/error-codes.constant';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockHost: ArgumentsHost;
  let mockRequest: Record<string, unknown>;
  let mockResponse: { status: jest.Mock; json: jest.Mock };

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    mockRequest = {
      method: 'GET',
      url: '/api/v1/users',
      headers: { 'x-request-id': 'req-filter-123' },
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockHost = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as unknown as ArgumentsHost;
  });

  it('should catch DomainException and format standard error envelope', () => {
    const domainErr = new ValidationException('Invalid email format');
    filter.catch(domainErr, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: ERROR_CODES.VALIDATION.INVALID_INPUT.code,
          message: 'Invalid email format',
          requestId: 'req-filter-123',
        }),
      }),
    );
  });

  it('should catch NestJS HttpException and format error envelope', () => {
    const httpErr = new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    filter.catch(httpErr, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'HTTP_EXCEPTION',
          message: 'Forbidden',
          requestId: 'req-filter-123',
        }),
      }),
    );
  });

  it('should catch 429 Too Many Requests and format RATE_LIMIT_EXCEEDED', () => {
    const rateLimitErr = new HttpException('ThrottlerException: Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
    filter.catch(rateLimitErr, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.TOO_MANY_REQUESTS);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'ThrottlerException: Too Many Requests',
          requestId: 'req-filter-123',
        }),
      }),
    );
  });

  it('should catch unhandled exceptions and format 500 INTERNAL_SERVER_ERROR', () => {
    const unhandledErr = new Error('Database crash');
    filter.catch(unhandledErr, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'INTERNAL_SERVER_ERROR',
          message: expect.any(String),
          requestId: 'req-filter-123',
        }),
      }),
    );
  });
});
