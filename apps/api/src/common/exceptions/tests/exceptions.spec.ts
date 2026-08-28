import { HttpStatus } from '@nestjs/common';

import { ERROR_CODES } from '../../error-codes/error-codes.constant';
import { BaseException } from '../base.exception';
import { BusinessException } from '../business.exception';
import { ConflictException } from '../conflict.exception';
import { DatabaseException } from '../database.exception';
import { DomainException } from '../domain.exception';
import { ExternalServiceException } from '../external-service.exception';
import { ForbiddenOperationException } from '../forbidden-operation.exception';
import { InfrastructureException } from '../infrastructure.exception';
import { QueueException } from '../queue.exception';
import { RateLimitExceededException } from '../rate-limit-exceeded.exception';
import { ResourceNotFoundException } from '../resource-not-found.exception';
import { StorageException } from '../storage.exception';
import { UnauthorizedOperationException } from '../unauthorized-operation.exception';
import { ValidationException } from '../validation.exception';

describe('Exception Hierarchy', () => {
  describe('Domain Exceptions', () => {
    it('ValidationException should inherit from DomainException and BaseException', () => {
      const exc = new ValidationException('Field is invalid', [{ field: 'email' }]);
      expect(exc).toBeInstanceOf(DomainException);
      expect(exc).toBeInstanceOf(BaseException);
      expect(exc.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exc.code).toBe(ERROR_CODES.VALIDATION.INVALID_INPUT.code);
      expect(exc.details).toEqual([{ field: 'email' }]);
      expect(typeof exc.timestamp).toBe('string');
      expect(new Date(exc.timestamp).getTime()).not.toBeNaN();
    });

    it('BusinessException should inherit from DomainException', () => {
      const exc = new BusinessException(ERROR_CODES.USER.UNDERAGE);
      expect(exc).toBeInstanceOf(DomainException);
      expect(exc.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(exc.code).toBe(ERROR_CODES.USER.UNDERAGE.code);
      expect(typeof exc.timestamp).toBe('string');
    });

    it('ConflictException should inherit from DomainException', () => {
      const exc = new ConflictException(ERROR_CODES.USER.PHONE_EXISTS);
      expect(exc).toBeInstanceOf(DomainException);
      expect(exc.getStatus()).toBe(HttpStatus.CONFLICT);
      expect(exc.code).toBe(ERROR_CODES.USER.PHONE_EXISTS.code);
    });

    it('ResourceNotFoundException should inherit from DomainException', () => {
      const exc = new ResourceNotFoundException(ERROR_CODES.USER.NOT_FOUND);
      expect(exc).toBeInstanceOf(DomainException);
      expect(exc.getStatus()).toBe(HttpStatus.NOT_FOUND);
      expect(exc.code).toBe(ERROR_CODES.USER.NOT_FOUND.code);
    });

    it('UnauthorizedOperationException should inherit from DomainException', () => {
      const exc = new UnauthorizedOperationException();
      expect(exc).toBeInstanceOf(DomainException);
      expect(exc.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      expect(exc.code).toBe(ERROR_CODES.AUTH.TOKEN_INVALID.code);
    });

    it('ForbiddenOperationException should inherit from DomainException', () => {
      const exc = new ForbiddenOperationException();
      expect(exc).toBeInstanceOf(DomainException);
      expect(exc.getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect(exc.code).toBe(ERROR_CODES.AUTH.FORBIDDEN.code);
    });

    it('RateLimitExceededException should inherit from DomainException', () => {
      const exc = new RateLimitExceededException();
      expect(exc).toBeInstanceOf(DomainException);
      expect(exc.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(exc.code).toBe(ERROR_CODES.AUTH.RATE_LIMITED.code);
    });
  });

  describe('Infrastructure Exceptions', () => {
    it('StorageException should inherit from InfrastructureException and BaseException', () => {
      const exc = new StorageException();
      expect(exc).toBeInstanceOf(InfrastructureException);
      expect(exc).toBeInstanceOf(BaseException);
      expect(exc.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(exc.code).toBe(ERROR_CODES.MEDIA.UPLOAD_FAILED.code);
      expect(typeof exc.timestamp).toBe('string');
    });

    it('QueueException should inherit from InfrastructureException', () => {
      const exc = new QueueException();
      expect(exc).toBeInstanceOf(InfrastructureException);
      expect(exc.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(exc.code).toBe(ERROR_CODES.QUEUE.DISPATCH_FAILED.code);
    });

    it('ExternalServiceException should inherit from InfrastructureException', () => {
      const exc = new ExternalServiceException();
      expect(exc).toBeInstanceOf(InfrastructureException);
      expect(exc.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
      expect(exc.code).toBe(ERROR_CODES.EXTERNAL_SERVICE.GATEWAY_ERROR.code);
    });

    it('DatabaseException should inherit from InfrastructureException', () => {
      const exc = new DatabaseException();
      expect(exc).toBeInstanceOf(InfrastructureException);
      expect(exc.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(exc.code).toBe(ERROR_CODES.DATABASE.UNHANDLED_ERROR.code);
    });
  });

  describe('ERROR_CODES Constants Immutability', () => {
    it('should contain all 22 required domain namespaces and be deeply frozen', () => {
      const namespaces = [
        'AUTH',
        'USER',
        'SALON',
        'BRANCH',
        'STAFF',
        'SERVICE',
        'BOOKING',
        'PAYMENT',
        'REVIEW',
        'COUPON',
        'MEDIA',
        'NOTIFICATION',
        'SEARCH',
        'ANALYTICS',
        'INVENTORY',
        'CRM',
        'VALIDATION',
        'SYSTEM',
        'QUEUE',
        'CACHE',
        'DATABASE',
        'EXTERNAL_SERVICE',
      ];

      expect(Object.isFrozen(ERROR_CODES)).toBe(true);
      for (const ns of namespaces) {
        expect(ERROR_CODES).toHaveProperty(ns);
        expect(Object.isFrozen(ERROR_CODES[ns as keyof typeof ERROR_CODES])).toBe(true);
      }
    });
  });
});
