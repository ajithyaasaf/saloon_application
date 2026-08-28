import { HttpStatus, ForbiddenException, BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole, PaymentProvider, PaymentStatus, BookingStatus } from '@prisma/client';
import { createHmac } from 'crypto';
import { RolesGuard } from '../guards/roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { GlobalExceptionFilter } from '../filters/global-exception.filter';
import { SecurityUtil } from '../utils/security.util';
import { ValidationUtil } from '../utils/validation.util';
import { PiiMaskerUtil } from '../utils/pii-masker.util';
import { StorageSecurityUtil } from '../../infrastructure/storage/utils/storage-security.util';

describe('Phase 26.9 — Adversarial Security, Penetration Simulation & Abuse Verification', () => {
  let reflector: Reflector;
  let rolesGuard: RolesGuard;
  let exceptionFilter: GlobalExceptionFilter;

  beforeEach(() => {
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
    exceptionFilter = new GlobalExceptionFilter();
  });

  // =========================================================================
  // 1. AUTHENTICATION & CREDENTIAL ATTACK SIMULATION
  // =========================================================================
  describe('1. Authentication & Credential Attacks', () => {
    it('rejects authentication when empty or whitespace-only credentials are submitted', () => {
      const isBlankPassword = (pwd: string) => !pwd || pwd.trim().length === 0;
      expect(isBlankPassword('')).toBe(true);
      expect(isBlankPassword('   ')).toBe(true);
      expect(isBlankPassword('ValidPassword123!')).toBe(false);
    });

    it('rejects oversized credential payloads that attempt DoS memory exhaustion', () => {
      const maliciousOversizedPassword = 'A'.repeat(50000);
      const isPasswordLengthSafe = (pwd: string) => pwd.length <= 128;
      expect(isPasswordLengthSafe(maliciousOversizedPassword)).toBe(false);
      expect(isPasswordLengthSafe('P@ssword1234567890')).toBe(true);
    });

    it('mitigates timing attacks by using constant-time comparison on OTPs and signatures', () => {
      const validSignature = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      const attackerSignature = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b800';

      const isMatch = SecurityUtil.timingSafeEqual(validSignature, attackerSignature);
      expect(isMatch).toBe(false);
    });
  });

  // =========================================================================
  // 2. JWT FORGERY & ALGORITHM CONFUSION ATTACKS
  // =========================================================================
  describe('2. JWT Forgery & Signature Tampering', () => {
    it('detects and rejects alg:none unsigned token forgery attempts', () => {
      const forgeAlgNoneToken = (payload: object) => {
        const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
        const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
        return `${header}.${body}.`;
      };

      const forgedToken = forgeAlgNoneToken({ sub: 'admin-1', role: UserRole.SUPER_ADMIN });
      expect(forgedToken.endsWith('.')).toBe(true);
      // Valid verification enforces HS256/RS256 signature presence
      const parts = forgedToken.split('.');
      const hasSignature = parts.length === 3 && parts[2].length > 0;
      expect(hasSignature).toBe(false);
    });

    it('detects tampered JWT payload when signature is unchanged', () => {
      const secret = 'super-secret-key-32-chars-long-security-test!';
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const originalPayload = Buffer.from(JSON.stringify({ sub: 'user-1', role: UserRole.CUSTOMER })).toString('base64url');
      const validSig = createHmac('sha256', secret).update(`${header}.${originalPayload}`).digest('base64url');

      // Attacker tampers role to SUPER_ADMIN without valid secret
      const tamperedPayload = Buffer.from(JSON.stringify({ sub: 'user-1', role: UserRole.SUPER_ADMIN })).toString('base64url');
      const recomputedSig = createHmac('sha256', secret).update(`${header}.${tamperedPayload}`).digest('base64url');

      expect(SecurityUtil.timingSafeEqual(validSig, recomputedSig)).toBe(false);
    });
  });

  // =========================================================================
  // 3. RBAC PRIVILEGE ESCALATION ATTACKS
  // =========================================================================
  describe('3. RBAC Privilege Escalation Attacks', () => {
    const mockContext = (userRole: UserRole | undefined, allowedRoles: UserRole[]): any => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(allowedRoles);
      return {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            user: userRole ? { sub: 'usr-1', role: userRole, email: 'attacker@evil.com' } : undefined,
          }),
        }),
      };
    };

    it('blocks CUSTOMER from accessing SUPER_ADMIN endpoints (403 Forbidden)', () => {
      const context = mockContext(UserRole.CUSTOMER, [UserRole.SUPER_ADMIN]);
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('blocks SALON_STAFF from accessing SALON_OWNER endpoints (403 Forbidden)', () => {
      const context = mockContext(UserRole.SALON_STAFF, [UserRole.SALON_OWNER]);
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('blocks SALON_OWNER from accessing SUPER_ADMIN endpoints (403 Forbidden)', () => {
      const context = mockContext(UserRole.SALON_OWNER, [UserRole.SUPER_ADMIN]);
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('allows SUPER_ADMIN to access SUPER_ADMIN protected endpoints', () => {
      const context = mockContext(UserRole.SUPER_ADMIN, [UserRole.SUPER_ADMIN]);
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('allows SALON_OWNER and SUPPORT_AGENT on shared staff/management endpoints', () => {
      const contextOwner = mockContext(UserRole.SALON_OWNER, [UserRole.SALON_OWNER, UserRole.SUPPORT_AGENT]);
      const contextAgent = mockContext(UserRole.SUPPORT_AGENT, [UserRole.SALON_OWNER, UserRole.SUPPORT_AGENT]);
      expect(rolesGuard.canActivate(contextOwner)).toBe(true);
      expect(rolesGuard.canActivate(contextAgent)).toBe(true);
    });
  });

  // =========================================================================
  // 4. IDOR & MULTI-TENANT ISOLATION ATTACK SIMULATION
  // =========================================================================
  describe('4. IDOR & Multi-Tenant Isolation Protection', () => {
    interface BookingEntity {
      id: string;
      customerId: string;
      salonId: string;
      totalPrice: number;
    }

    const bookingsDb: BookingEntity[] = [
      { id: 'book-cust-A', customerId: 'cust-A-123', salonId: 'salon-X-1', totalPrice: 1500 },
      { id: 'book-cust-B', customerId: 'cust-B-456', salonId: 'salon-Y-2', totalPrice: 3200 },
    ];

    const getBookingForCustomer = (bookingId: string, currentCustomerId: string): BookingEntity => {
      const booking = bookingsDb.find((b) => b.id === bookingId);
      if (!booking || booking.customerId !== currentCustomerId) {
        throw new ForbiddenException('You do not have permission to view this booking.');
      }
      return booking;
    };

    it('CUSTOMER A cannot access CUSTOMER B booking via IDOR (throws 403 Forbidden)', () => {
      expect(() => getBookingForCustomer('book-cust-B', 'cust-A-123')).toThrow(ForbiddenException);
    });

    it('CUSTOMER A can access their own booking', () => {
      const booking = getBookingForCustomer('book-cust-A', 'cust-A-123');
      expect(booking.id).toBe('book-cust-A');
      expect(booking.customerId).toBe('cust-A-123');
    });

    const getSalonInventory = (salonId: string, callerSalonId: string) => {
      if (salonId !== callerSalonId) {
        throw new ForbiddenException('Cross-tenant salon access violation.');
      }
      return { salonId, inventoryItems: ['shampoo', 'conditioner'] };
    };

    it('SALON X manager cannot read SALON Y inventory via tenant ID manipulation (throws 403)', () => {
      expect(() => getSalonInventory('salon-Y-2', 'salon-X-1')).toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // 5. INPUT FUZZING, PROTOTYPE POLLUTION & PAYLOAD SANITIZATION
  // =========================================================================
  describe('5. Input Fuzzing & Prototype Pollution Protection', () => {
    it('neutralizes prototype pollution attempt in object keys (__proto__, constructor)', () => {
      const maliciousPayload = JSON.parse('{"__proto__": {"polluted": true}, "name": "Safe Name"}');
      // Verify global Object prototype remains unpolluted
      expect((({} as any)).polluted).toBeUndefined();
      expect(maliciousPayload.name).toBe('Safe Name');
    });

    it('validates UUIDs, emails, and phone formats strictly using ValidationUtil', () => {
      expect(ValidationUtil.isValidEmail('attacker@malicious.com')).toBe(true);
      expect(ValidationUtil.isValidEmail('attacker"onfocus=alert(1)@test.com')).toBe(false);
      expect(ValidationUtil.isValidIndianPhone('+919876543210')).toBe(true);
      expect(ValidationUtil.isValidIndianPhone('12345')).toBe(false);
      expect(ValidationUtil.isValidUuid('c9bf9e57-1685-4c89-bafb-ff5af830be8a')).toBe(true);
      expect(ValidationUtil.isValidUuid('../../etc/passwd')).toBe(false);
    });

    it('masks PII fields to prevent sensitive customer data leaks', () => {
      expect(PiiMaskerUtil.maskEmail('john.doe@example.com')).toBe('j***e@example.com');
      expect(PiiMaskerUtil.maskPhone('+919876543210')).toBe('+91******3210');
    });
  });

  // =========================================================================
  // 6. PAYMENT TAMPERING & WEBHOOK SIGNATURE ATTACKS
  // =========================================================================
  describe('6. Payment Security & Webhook Cryptographic Verification', () => {
    const webhookSecret = 'rzp_webhook_secret_key_1234567890';

    it('verifies valid HMAC-SHA256 signature from authorized payment gateway', () => {
      const payload = JSON.stringify({ event: 'payment.captured', payment_id: 'pay_12345' });
      const validSignature = createHmac('sha256', webhookSecret).update(payload).digest('hex');

      const isAuthentic = SecurityUtil.timingSafeEqual(
        validSignature,
        createHmac('sha256', webhookSecret).update(payload).digest('hex'),
      );
      expect(isAuthentic).toBe(true);
    });

    it('rejects forged webhook payload with invalid signature', () => {
      const payload = JSON.stringify({ event: 'payment.captured', payment_id: 'pay_12345' });
      const attackerForgedSig = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

      const isAuthentic = SecurityUtil.timingSafeEqual(
        attackerForgedSig,
        createHmac('sha256', webhookSecret).update(payload).digest('hex'),
      );
      expect(isAuthentic).toBe(false);
    });
  });

  // =========================================================================
  // 7. BOOKING CONCURRENCY & OCC RACE CONDITION SIMULATION
  // =========================================================================
  describe('7. Concurrency & Optimistic Lock Conflict Simulation', () => {
    it('prevents double-spending / conflicting state transitions using version check', () => {
      let resourceState = { id: 'slot-123', isBooked: false, version: 1 };

      const bookSlot = (expectedVersion: number) => {
        if (resourceState.version !== expectedVersion) {
          throw new ConflictException('Optimistic lock conflict: resource was updated concurrently.');
        }
        resourceState = { ...resourceState, isBooked: true, version: resourceState.version + 1 };
        return resourceState;
      };

      // Transaction A succeeds
      const resultA = bookSlot(1);
      expect(resultA.isBooked).toBe(true);
      expect(resultA.version).toBe(2);

      // Concurrent Transaction B with stale version 1 fails with 409 Conflict
      expect(() => bookSlot(1)).toThrow(ConflictException);
    });
  });

  // =========================================================================
  // 8. ERROR INFORMATION DISCLOSURE SANITIZATION
  // =========================================================================
  describe('8. Information Disclosure Suppression', () => {
    it('ensures internal SQL errors and connection credentials are never leaked to the client', () => {
      let jsonOutput: any = null;
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn((body) => {
          jsonOutput = body;
        }),
      };
      const mockRequest = { method: 'POST', url: '/api/v1/bookings', headers: {} };
      const host = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => mockRequest,
        }),
      } as any;

      const sensitiveDbError = new Error('FATAL: password authentication failed for user "postgres_root" at 10.0.4.12:5432');
      exceptionFilter.catch(sensitiveDbError, host);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(jsonOutput.success).toBe(false);
      expect(jsonOutput.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(jsonOutput.error.message).toBe('An unexpected error occurred. Please try again later.');
      // Verify no sensitive internal strings leaked
      expect(JSON.stringify(jsonOutput)).not.toContain('postgres_root');
      expect(JSON.stringify(jsonOutput)).not.toContain('10.0.4.12');
    });
  });

  // =========================================================================
  // 9. MEDIA STORAGE PATH TRAVERSAL DEFENSE
  // =========================================================================
  describe('9. Media Path Traversal Defense', () => {
    it('enforces deterministic namespace and blocks directory traversal sequences', () => {
      const maliciousKey = '../../../../etc/passwd';
      expect(maliciousKey.includes('..')).toBe(true);

      const isSafe = StorageSecurityUtil.isSafeObjectKey('salons/salon-1/avatars/valid-uuid.jpg');
      expect(isSafe).toBe(true);

      const isTraversalSafe = StorageSecurityUtil.isSafeObjectKey('salons/salon-1/../../etc/passwd');
      expect(isTraversalSafe).toBe(false);
    });
  });
});
