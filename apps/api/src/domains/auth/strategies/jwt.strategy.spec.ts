import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';

import { JwtPayload } from '../dto/token-payload.dto';
import { JwtStrategy } from './jwt.strategy';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_PAYLOAD: JwtPayload = {
  sub: 'a3d9f2c1-b04e-724d-8593-c17b2d6e0f9a',
  role: UserRole.CUSTOMER,
  sessionId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  version: 1,
  iat: Math.floor(Date.now() / 1000) - 60,
  exp: Math.floor(Date.now() / 1000) + 840,
};

const MOCK_ACCESS_SECRET = 'test-access-secret-minimum-32-chars-long';

// ─── ConfigService Mock ───────────────────────────────────────────────────────

const mockConfigService = {
  getOrThrow: jest.fn((key: string): string => {
    if (key === 'jwt.accessSecret') return MOCK_ACCESS_SECRET;
    throw new Error(`Unexpected config key: ${key}`);
  }),
};

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── Constructor ───────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('should be defined', () => {
      expect(strategy).toBeDefined();
    });

    it('should read jwt.accessSecret from ConfigService', () => {
      expect(mockConfigService.getOrThrow).toHaveBeenCalledWith('jwt.accessSecret');
    });
  });

  // ─── validate() — happy path ───────────────────────────────────────────────

  describe('validate() — valid payloads', () => {
    it('should return the payload unchanged when all claims are valid', () => {
      const result = strategy.validate(VALID_PAYLOAD);
      expect(result).toEqual(VALID_PAYLOAD);
    });

    it('should accept SALON_OWNER role', () => {
      const payload = { ...VALID_PAYLOAD, role: UserRole.SALON_OWNER };
      expect(strategy.validate(payload)).toEqual(payload);
    });

    it('should accept SALON_STAFF role', () => {
      const payload = { ...VALID_PAYLOAD, role: UserRole.SALON_STAFF };
      expect(strategy.validate(payload)).toEqual(payload);
    });

    it('should accept SUPER_ADMIN role', () => {
      const payload = { ...VALID_PAYLOAD, role: UserRole.SUPER_ADMIN };
      expect(strategy.validate(payload)).toEqual(payload);
    });

    it('should accept SUPPORT_AGENT role', () => {
      const payload = { ...VALID_PAYLOAD, role: UserRole.SUPPORT_AGENT };
      expect(strategy.validate(payload)).toEqual(payload);
    });
  });

  // ─── validate() — missing claims ──────────────────────────────────────────

  describe('validate() — missing or empty claims', () => {
    it('should throw UnauthorizedException when sub is missing', () => {
      const { sub, ...payload } = VALID_PAYLOAD;
      void sub;
      expect(() => strategy.validate(payload)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when sub is an empty string', () => {
      expect(() =>
        strategy.validate({ ...VALID_PAYLOAD, sub: '' }),
      ).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when role is missing', () => {
      const { role, ...payload } = VALID_PAYLOAD;
      void role;
      expect(() => strategy.validate(payload)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when sessionId is missing', () => {
      const { sessionId, ...payload } = VALID_PAYLOAD;
      void sessionId;
      expect(() => strategy.validate(payload)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when sessionId is an empty string', () => {
      expect(() =>
        strategy.validate({ ...VALID_PAYLOAD, sessionId: '' }),
      ).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when version is missing', () => {
      const { version, ...payload } = VALID_PAYLOAD;
      void version;
      expect(() => strategy.validate(payload)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when iat is missing', () => {
      const { iat, ...payload } = VALID_PAYLOAD;
      void iat;
      expect(() => strategy.validate(payload)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when exp is missing', () => {
      const { exp, ...payload } = VALID_PAYLOAD;
      void exp;
      expect(() => strategy.validate(payload)).toThrow(UnauthorizedException);
    });
  });

  // ─── validate() — invalid claim types ─────────────────────────────────────

  describe('validate() — invalid claim types', () => {
    it('should throw UnauthorizedException when role is not a valid UserRole enum value', () => {
      expect(() =>
        strategy.validate({ ...VALID_PAYLOAD, role: 'UNKNOWN_ROLE' }),
      ).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when sub is a number instead of string', () => {
      expect(() =>
        strategy.validate({ ...VALID_PAYLOAD, sub: 12345 }),
      ).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when version is zero', () => {
      expect(() =>
        strategy.validate({ ...VALID_PAYLOAD, version: 0 }),
      ).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when version is a negative number', () => {
      expect(() =>
        strategy.validate({ ...VALID_PAYLOAD, version: -1 }),
      ).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when version is Infinity', () => {
      expect(() =>
        strategy.validate({ ...VALID_PAYLOAD, version: Infinity }),
      ).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when version is NaN', () => {
      expect(() =>
        strategy.validate({ ...VALID_PAYLOAD, version: NaN }),
      ).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when iat is not a finite number', () => {
      expect(() =>
        strategy.validate({ ...VALID_PAYLOAD, iat: NaN }),
      ).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when exp is not a finite number', () => {
      expect(() =>
        strategy.validate({ ...VALID_PAYLOAD, exp: Infinity }),
      ).toThrow(UnauthorizedException);
    });
  });

  // ─── validate() — malformed payload ───────────────────────────────────────

  describe('validate() — malformed payload structure', () => {
    it('should throw UnauthorizedException when payload is null', () => {
      expect(() => strategy.validate(null)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when payload is undefined', () => {
      expect(() => strategy.validate(undefined)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when payload is a string', () => {
      expect(() => strategy.validate('invalid')).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when payload is a number', () => {
      expect(() => strategy.validate(42)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when payload is an empty object', () => {
      expect(() => strategy.validate({})).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when payload is an array', () => {
      expect(() => strategy.validate([])).toThrow(UnauthorizedException);
    });
  });
});
