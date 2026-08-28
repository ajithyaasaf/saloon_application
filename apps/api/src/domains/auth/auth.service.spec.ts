import * as crypto from 'crypto';

import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';

import { CACHE_KEYS, CACHE_TTL } from '../../common/constants/cache-keys.constant';
import { QUEUE_NOTIFICATION_SMS } from '../../common/constants/queues.constant';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { SessionRepository } from './repositories/session.repository';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PHONE_RAW = '9876543210';
const PHONE_NORMALIZED = '9876543210';
const PHONE_WITH_PREFIX = '+919876543210';
const USER_ID = 'a3d9f2c1-b04e-724d-8593-c17b2d6e0f9a';
const SESSION_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const OTP_RAW = '482951';
const USER_AGENT = 'TestAgent/1.0';
const IP_ADDRESS = '127.0.0.1';

const MOCK_USER = {
  id: USER_ID,
  phone: PHONE_NORMALIZED,
  phoneVerified: true,
  email: null,
  firstName: 'Customer',
  lastName: null,
  role: UserRole.CUSTOMER,
  isActive: true,
  version: 1,
  createdAt: new Date('2024-01-15T10:30:00.000Z'),
};

const MOCK_SESSION = {
  id: SESSION_ID,
  userId: USER_ID,
  refreshTokenHash: '$2b$10$hashedRefreshToken',
  deviceId: 'device-001',
  userAgent: USER_AGENT,
  ipAddress: IP_ADDRESS,
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  createdAt: new Date(),
};

const SALON_OWNER_USER = {
  id: USER_ID,
  phone: PHONE_NORMALIZED,
  phoneVerified: true,
  email: 'owner@glamoursalon.in',
  firstName: 'Owner',
  lastName: 'User',
  role: UserRole.SALON_OWNER,
  isActive: true,
  version: 1,
  createdAt: new Date('2024-01-15T10:30:00.000Z'),
};

const SEND_OTP_DTO: SendOtpDto = { phone: PHONE_RAW };

const VERIFY_OTP_DTO: VerifyOtpDto = {
  phone: PHONE_RAW,
  otp: OTP_RAW,
  device: {
    deviceId: 'device-001',
    deviceName: 'iPhone 15',
    platform: 'ios',
    appVersion: '1.0.0',
  },
};

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPrisma = {
  user: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  userSession: {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
};

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
};

const mockQueue = {
  dispatch: jest.fn(),
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('mock.access.token'),
};

const mockConfig = {
  get: jest.fn().mockReturnValue('15m'),
  getOrThrow: jest.fn().mockReturnValue('test-secret'),
};

const mockSessionRepo = {
  createSession: jest.fn(),
  findById: jest.fn(),
  revokeSession: jest.fn(),
  revokeAllUserSessions: jest.fn(),
  updateRefreshToken: jest.fn(),
  findUserSessions: jest.fn(),
};

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: QueueService, useValue: mockQueue },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: SessionRepository, useValue: mockSessionRepo },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── requestOtp() ─────────────────────────────────────────────────────────

  describe('requestOtp()', () => {
    beforeEach(() => {
      // Default: first request in window (count = 1), no lockout
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(true);
      mockRedis.set.mockResolvedValue(undefined);
      mockQueue.dispatch.mockResolvedValue(undefined);
    });

    it('should return a generic success message', async () => {
      const result = await service.requestOtp(SEND_OTP_DTO);
      expect(result).toEqual({ message: 'OTP sent successfully' });
    });

    it('should normalize phone with +91 prefix before using as Redis key', async () => {
      await service.requestOtp({ phone: PHONE_WITH_PREFIX });

      // Rate limit key should use normalized (10-digit) phone
      const rateLimitKey = CACHE_KEYS.OTP_RATE_LIMIT(PHONE_NORMALIZED);
      expect(mockRedis.incr).toHaveBeenCalledWith(rateLimitKey);
    });

    it('should store OTP hash (not raw OTP) in Redis', async () => {
      // Spy on crypto to know what OTP was generated
      const randomIntSpy = jest
        .spyOn(crypto, 'randomInt')
        .mockReturnValue(482951 as never);

      await service.requestOtp(SEND_OTP_DTO);

      // Redis set should be called with an object containing a `hash` key
      expect(mockRedis.set).toHaveBeenCalledWith(
        CACHE_KEYS.OTP(PHONE_NORMALIZED),
        expect.objectContaining({
          hash: expect.stringMatching(/^\$2b\$/), // bcrypt hash prefix
          attempts: 0,
        }),
        300, // CACHE_TTL.OTP
      );

      randomIntSpy.mockRestore();
    });

    it('should dispatch SMS job to QUEUE_NOTIFICATION_SMS', async () => {
      await service.requestOtp(SEND_OTP_DTO);

      expect(mockQueue.dispatch).toHaveBeenCalledWith(
        QUEUE_NOTIFICATION_SMS,
        'sms.otp',
        expect.objectContaining({ phone: PHONE_NORMALIZED }),
        expect.objectContaining({ attempts: 3 }),
      );
    });

    it('should use crypto.randomInt() to generate OTP (not Math.random)', async () => {
      const spy = jest
        .spyOn(crypto, 'randomInt')
        .mockReturnValue(123456 as never);
      const mathSpy = jest.spyOn(Math, 'random');

      await service.requestOtp(SEND_OTP_DTO);

      expect(spy).toHaveBeenCalledWith(0, 1_000_000);
      expect(mathSpy).not.toHaveBeenCalled();

      spy.mockRestore();
      mathSpy.mockRestore();
    });

    it('should set expire on the rate-limit key only on the first request', async () => {
      mockRedis.incr.mockResolvedValue(1); // first request

      await service.requestOtp(SEND_OTP_DTO);

      expect(mockRedis.expire).toHaveBeenCalledWith(
        CACHE_KEYS.OTP_RATE_LIMIT(PHONE_NORMALIZED),
        900, // OTP_RATE_LIMIT_WINDOW
      );
    });

    it('should NOT call expire when count > 1 (window already set)', async () => {
      mockRedis.incr.mockResolvedValue(2); // second request in window

      await service.requestOtp(SEND_OTP_DTO);

      expect(mockRedis.expire).not.toHaveBeenCalled();
    });

    it('should throw 429 when rate limit is exceeded (count > 3)', async () => {
      mockRedis.incr.mockResolvedValue(4); // 4th request

      await expect(service.requestOtp(SEND_OTP_DTO)).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
      });
      expect(mockQueue.dispatch).not.toHaveBeenCalled();
    });

    it('should not dispatch SMS when rate limit is exceeded', async () => {
      mockRedis.incr.mockResolvedValue(5);

      await expect(service.requestOtp(SEND_OTP_DTO)).rejects.toThrow(
        HttpException,
      );
      expect(mockQueue.dispatch).not.toHaveBeenCalled();
    });
  });

  // ─── verifyOtp() ──────────────────────────────────────────────────────────

  describe('verifyOtp()', () => {
    let validOtpHash: string;

    beforeEach(async () => {
      // Pre-compute a real bcrypt hash to use in tests
      const bcrypt = await import('bcrypt');
      validOtpHash = await bcrypt.hash(OTP_RAW, 12);

      // Default happy-path mocks
      mockRedis.get.mockImplementation(async (key: string) => {
        if (key.endsWith(':attempts')) {
          return null; // no lockout
        }
        if (key.startsWith('otp:')) {
          return { hash: validOtpHash, attempts: 0 };
        }
        return null;
      });
      mockRedis.del.mockResolvedValue(undefined);
      mockPrisma.user.upsert.mockResolvedValue(MOCK_USER);
      mockSessionRepo.createSession.mockResolvedValue(MOCK_SESSION);
      mockJwt.sign.mockReturnValue('mock.access.token');
    });

    it('should return AuthResponseDto with accessToken and refreshToken on success', async () => {
      const result = await service.verifyOtp(VERIFY_OTP_DTO, USER_AGENT, IP_ADDRESS);

      expect(result).toMatchObject({
        accessToken: 'mock.access.token',
        refreshToken: expect.any(String),
        expiresIn: 900,
      });
    });

    it('should create a new Customer account when phone does not exist', async () => {
      await service.verifyOtp(VERIFY_OTP_DTO, USER_AGENT, IP_ADDRESS);

      expect(mockPrisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { phone: PHONE_NORMALIZED },
          create: expect.objectContaining({
            phone: PHONE_NORMALIZED,
            role: UserRole.CUSTOMER,
            phoneVerified: true,
          }),
        }),
      );
    });

    it('should reuse existing account (update phoneVerified=true) when user exists', async () => {
      await service.verifyOtp(VERIFY_OTP_DTO, USER_AGENT, IP_ADDRESS);

      expect(mockPrisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ phoneVerified: true }),
        }),
      );
    });

    it('should create a UserSession with correct device info', async () => {
      await service.verifyOtp(VERIFY_OTP_DTO, USER_AGENT, IP_ADDRESS);

      expect(mockSessionRepo.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          deviceId: VERIFY_OTP_DTO.device!.deviceId,
          ipAddress: IP_ADDRESS,
        }),
      );
    });

    it('should store bcrypt hash of refresh token — not raw UUID', async () => {
      await service.verifyOtp(VERIFY_OTP_DTO, USER_AGENT, IP_ADDRESS);

      const callArgs = mockSessionRepo.createSession.mock.calls[0][0] as {
        refreshTokenHash: string;
      };
      expect(callArgs.refreshTokenHash).toMatch(/^\$2b\$/);
      expect(callArgs.refreshTokenHash).not.toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4/,
      ); // not a raw UUID
    });

    it('should call JwtService.sign with sub, role, sessionId, version', async () => {
      await service.verifyOtp(VERIFY_OTP_DTO, USER_AGENT, IP_ADDRESS);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: USER_ID,
          role: UserRole.CUSTOMER,
          sessionId: SESSION_ID,
          version: MOCK_USER.version,
        }),
        expect.objectContaining({ expiresIn: '15m' }),
      );
    });

    it('should delete the OTP key and attempts key after successful verification', async () => {
      await service.verifyOtp(VERIFY_OTP_DTO, USER_AGENT, IP_ADDRESS);

      expect(mockRedis.del).toHaveBeenCalledWith(
        CACHE_KEYS.OTP(PHONE_NORMALIZED),
        CACHE_KEYS.OTP_ATTEMPTS(PHONE_NORMALIZED),
      );
    });

    it('should throw 401 when no OTP exists in Redis (expired or not requested)', async () => {
      mockRedis.get.mockImplementation(async (key: string) => {
        if (key.endsWith(':attempts')) return null; // no lockout
        return null; // no OTP entry
      });

      await expect(
        service.verifyOtp(VERIFY_OTP_DTO, USER_AGENT, IP_ADDRESS),
      ).rejects.toMatchObject({ status: HttpStatus.UNAUTHORIZED });
    });

    it('should throw 401 when OTP does not match (wrong OTP)', async () => {
      const bcrypt = await import('bcrypt');
      const wrongHash = await bcrypt.hash('000000', 12);

      mockRedis.get.mockImplementation(async (key: string) => {
        if (key.endsWith(':attempts')) return null;
        return { hash: wrongHash, attempts: 0 };
      });

      await expect(
        service.verifyOtp(VERIFY_OTP_DTO, USER_AGENT, IP_ADDRESS),
      ).rejects.toMatchObject({ status: HttpStatus.UNAUTHORIZED });
    });

    it('should increment attempts counter on wrong OTP (below lockout threshold)', async () => {
      const bcrypt = await import('bcrypt');
      const wrongHash = await bcrypt.hash('000000', 12);

      mockRedis.get.mockImplementation(async (key: string) => {
        if (key.endsWith(':attempts')) return null;
        return { hash: wrongHash, attempts: 0 };
      });
      mockRedis.set.mockResolvedValue(undefined);

      await expect(
        service.verifyOtp(VERIFY_OTP_DTO, USER_AGENT, IP_ADDRESS),
      ).rejects.toThrow();

      // Attempts incremented to 1 and stored back in Redis
      expect(mockRedis.set).toHaveBeenCalledWith(
        CACHE_KEYS.OTP(PHONE_NORMALIZED),
        { hash: wrongHash, attempts: 1 },
        CACHE_TTL.OTP,
      );
    });

    it('should delete OTP and set lockout when 3rd attempt fails', async () => {
      const bcrypt = await import('bcrypt');
      const wrongHash = await bcrypt.hash('000000', 12);

      mockRedis.get.mockImplementation(async (key: string) => {
        if (key.endsWith(':attempts')) return null;
        return { hash: wrongHash, attempts: 2 }; // 2 previous attempts
      });
      mockRedis.del.mockResolvedValue(undefined);
      mockRedis.set.mockResolvedValue(undefined);

      await expect(
        service.verifyOtp(VERIFY_OTP_DTO, USER_AGENT, IP_ADDRESS),
      ).rejects.toThrow();

      // OTP key should be deleted
      expect(mockRedis.del).toHaveBeenCalledWith(
        CACHE_KEYS.OTP(PHONE_NORMALIZED),
      );
      // Lockout key should be set
      expect(mockRedis.set).toHaveBeenCalledWith(
        CACHE_KEYS.OTP_ATTEMPTS(PHONE_NORMALIZED),
        3,
        CACHE_TTL.OTP_LOCKOUT,
      );
    });

    it('should throw 429 when phone is in active lockout', async () => {
      // Lockout check returns 3+ attempts
      mockRedis.get.mockResolvedValueOnce(3); // locked out

      await expect(
        service.verifyOtp(VERIFY_OTP_DTO, USER_AGENT, IP_ADDRESS),
      ).rejects.toMatchObject({ status: HttpStatus.TOO_MANY_REQUESTS });

      // Should not proceed to OTP lookup
      expect(mockRedis.get).toHaveBeenCalledTimes(1);
    });

    it('should include user profile in the response', async () => {
      const result = await service.verifyOtp(VERIFY_OTP_DTO, USER_AGENT, IP_ADDRESS);

      expect(result.user).toBeDefined();
      expect(result.user.id).toBe(USER_ID);
      expect(result.user.role).toBe(UserRole.CUSTOMER);
    });

    it('should normalize +91 prefix in phone before OTP lookup', async () => {
      const dtoWithPrefix: VerifyOtpDto = {
        ...VERIFY_OTP_DTO,
        phone: PHONE_WITH_PREFIX,
      };

      await service.verifyOtp(dtoWithPrefix, USER_AGENT, IP_ADDRESS);

      expect(mockRedis.get).toHaveBeenCalledWith(
        CACHE_KEYS.OTP(PHONE_NORMALIZED),
      );
    });
  });

  // ─── loginWithPassword() ────────────────────────────────────────────────────

  describe('loginWithPassword()', () => {
    const EMAIL = 'owner@glamoursalon.in';
    const EMAIL_UPPER = 'OWNER@GLAMOURSALON.IN';
    const PASSWORD = 'SecureP@ss1';
    const FAILED_KEY = `ratelimit:login:failed:${EMAIL}`;

    const SALON_OWNER_USER = {
      ...MOCK_USER,
      email: EMAIL,
      role: UserRole.SALON_OWNER,
      isActive: true,
      passwordHash: '', // will be overwritten in beforeEach
    };

    const LOGIN_DTO: LoginDto = {
      email: EMAIL,
      password: PASSWORD,
      device: {
        deviceId: 'device-001',
        deviceName: 'Chrome/Windows',
        platform: 'web',
        appVersion: '1.0.0',
      },
    };

    let validPasswordHash: string;

    beforeEach(async () => {
      const bcrypt = await import('bcrypt');
      validPasswordHash = await bcrypt.hash(PASSWORD, 12);

      // Default: no lock active, user found, correct password, session created
      mockRedis.get.mockResolvedValue(null); // no lock
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(true);
      mockRedis.del.mockResolvedValue(undefined);
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue({
        ...SALON_OWNER_USER,
        passwordHash: validPasswordHash,
      });
      mockPrisma.auditLog = { create: jest.fn().mockResolvedValue({}) };
      mockSessionRepo.createSession.mockResolvedValue(MOCK_SESSION);
      mockJwt.sign.mockReturnValue('mock.access.token');
    });

    it('should return AuthResponseDto with accessToken and refreshToken on successful login', async () => {
      const result = await service.loginWithPassword(LOGIN_DTO, USER_AGENT, IP_ADDRESS);

      expect(result).toMatchObject({
        accessToken: 'mock.access.token',
        refreshToken: expect.any(String),
        expiresIn: 900,
      });
    });

    it('should normalize email to lowercase before lookup', async () => {
      const upperDto: LoginDto = { ...LOGIN_DTO, email: EMAIL_UPPER };

      await service.loginWithPassword(upperDto, USER_AGENT, IP_ADDRESS);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: EMAIL } }),
      );
    });

    it('should delete the failed attempt key on successful login', async () => {
      await service.loginWithPassword(LOGIN_DTO, USER_AGENT, IP_ADDRESS);

      expect(mockRedis.del).toHaveBeenCalledWith(FAILED_KEY);
    });

    it('should create a UserSession with correct userId and deviceId', async () => {
      await service.loginWithPassword(LOGIN_DTO, USER_AGENT, IP_ADDRESS);

      expect(mockSessionRepo.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          deviceId: LOGIN_DTO.device!.deviceId,
          ipAddress: IP_ADDRESS,
        }),
      );
    });

    it('should sign JWT with sub, role, sessionId, and version', async () => {
      await service.loginWithPassword(LOGIN_DTO, USER_AGENT, IP_ADDRESS);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: USER_ID,
          role: UserRole.SALON_OWNER,
          sessionId: SESSION_ID,
        }),
        expect.objectContaining({ expiresIn: '15m' }),
      );
    });

    it('should throw 401 when user is not found (without leaking existence)', async () => {
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(null);

      await expect(
        service.loginWithPassword(LOGIN_DTO, USER_AGENT, IP_ADDRESS),
      ).rejects.toMatchObject({
        status: HttpStatus.UNAUTHORIZED,
        message: 'Invalid credentials',
      });
    });

    it('should throw 401 when user has no passwordHash set', async () => {
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue({
        ...SALON_OWNER_USER,
        passwordHash: null,
      });

      await expect(
        service.loginWithPassword(LOGIN_DTO, USER_AGENT, IP_ADDRESS),
      ).rejects.toMatchObject({ status: HttpStatus.UNAUTHORIZED });
    });

    it('should throw 401 when user role is CUSTOMER (OTP-only)', async () => {
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue({
        ...SALON_OWNER_USER,
        role: UserRole.CUSTOMER,
        passwordHash: validPasswordHash,
      });

      await expect(
        service.loginWithPassword(LOGIN_DTO, USER_AGENT, IP_ADDRESS),
      ).rejects.toMatchObject({
        status: HttpStatus.UNAUTHORIZED,
        message: 'Invalid credentials',
      });
    });

    it('should throw 401 when account is disabled (isActive=false)', async () => {
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue({
        ...SALON_OWNER_USER,
        isActive: false,
        passwordHash: validPasswordHash,
      });

      await expect(
        service.loginWithPassword(LOGIN_DTO, USER_AGENT, IP_ADDRESS),
      ).rejects.toMatchObject({ status: HttpStatus.UNAUTHORIZED });
    });

    it('should throw 401 when password is wrong', async () => {
      const wrongPasswordDto: LoginDto = { ...LOGIN_DTO, password: 'WrongP@ss1' };
      mockRedis.incr.mockResolvedValue(1);

      await expect(
        service.loginWithPassword(wrongPasswordDto, USER_AGENT, IP_ADDRESS),
      ).rejects.toMatchObject({ status: HttpStatus.UNAUTHORIZED });
    });

    it('should increment the failed attempt counter on wrong password', async () => {
      const wrongPasswordDto: LoginDto = { ...LOGIN_DTO, password: 'WrongP@ss1' };
      mockRedis.incr.mockResolvedValue(1); // first failure

      await expect(
        service.loginWithPassword(wrongPasswordDto, USER_AGENT, IP_ADDRESS),
      ).rejects.toThrow();

      expect(mockRedis.incr).toHaveBeenCalledWith(FAILED_KEY);
      expect(mockRedis.expire).toHaveBeenCalledWith(FAILED_KEY, 1800);
    });

    it('should lock account and write audit log on 5th consecutive failure', async () => {
      const wrongPasswordDto: LoginDto = { ...LOGIN_DTO, password: 'WrongP@ss1' };
      mockRedis.incr.mockResolvedValue(5); // 5th failure

      await expect(
        service.loginWithPassword(wrongPasswordDto, USER_AGENT, IP_ADDRESS),
      ).rejects.toThrow();

      // TTL re-applied from last failure
      expect(mockRedis.expire).toHaveBeenCalledWith(FAILED_KEY, 1800);
      // Audit log written
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            whoId: USER_ID,
            action: 'LOGIN_FAILED',
            entityType: 'User',
          }),
        }),
      );
    });

    it('should throw 429 when account is locked (>= 5 prior failures in Redis)', async () => {
      mockRedis.get.mockResolvedValue(5); // already locked

      await expect(
        service.loginWithPassword(LOGIN_DTO, USER_AGENT, IP_ADDRESS),
      ).rejects.toMatchObject({ status: HttpStatus.TOO_MANY_REQUESTS });

      // Should not proceed to user lookup
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should support all non-Customer roles (SALON_STAFF, SUPER_ADMIN, SUPPORT_AGENT)', async () => {
      const nonCustomerRoles: UserRole[] = [
        UserRole.SALON_OWNER,
        UserRole.SALON_STAFF,
        UserRole.SUPER_ADMIN,
        UserRole.SUPPORT_AGENT,
      ];

      for (const role of nonCustomerRoles) {
        mockPrisma.user.findUnique = jest.fn().mockResolvedValue({
          ...SALON_OWNER_USER,
          role,
          passwordHash: validPasswordHash,
        });
        mockRedis.get.mockResolvedValue(null);
        mockRedis.del.mockResolvedValue(undefined);
        mockSessionRepo.createSession.mockResolvedValue(MOCK_SESSION);

        const result = await service.loginWithPassword(LOGIN_DTO, USER_AGENT, IP_ADDRESS);
        expect(result.accessToken).toBe('mock.access.token');
      }
    }, 15000);
  });

  // ─── refreshTokens() ────────────────────────────────────────────────────────

  describe('refreshTokens()', () => {
    const RAW_REFRESH_TOKEN = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    let validRefreshHash: string;

    const ACTIVE_SESSION = {
      ...MOCK_SESSION,
      refreshTokenHash: '', // set in beforeEach
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      user: MOCK_USER,
    };

    beforeEach(async () => {
      const bcrypt = await import('bcrypt');
      validRefreshHash = await bcrypt.hash(RAW_REFRESH_TOKEN, 12);
      ACTIVE_SESSION.refreshTokenHash = validRefreshHash;

      mockRedis.incr.mockResolvedValue(1); // rate limit count = 1
      mockRedis.expire.mockResolvedValue(true);
      mockPrisma.userSession.findMany = jest.fn().mockResolvedValue([ACTIVE_SESSION]);
      mockSessionRepo.updateRefreshToken = jest.fn().mockResolvedValue(ACTIVE_SESSION);
      mockJwt.sign.mockReturnValue('new.access.token');
    });

    it('should rotate token and return new AuthResponseDto on valid active refresh token', async () => {
      const result = await service.refreshTokens(RAW_REFRESH_TOKEN, IP_ADDRESS);

      expect(result).toMatchObject({
        accessToken: 'new.access.token',
        refreshToken: expect.any(String),
        expiresIn: 900,
      });
      expect(result.refreshToken).not.toBe(RAW_REFRESH_TOKEN); // rotated
    });

    it('should update the session with a new bcrypt hash and expiry', async () => {
      await service.refreshTokens(RAW_REFRESH_TOKEN, IP_ADDRESS);

      expect(mockSessionRepo.updateRefreshToken).toHaveBeenCalledWith(
        SESSION_ID,
        expect.objectContaining({
          refreshTokenHash: expect.stringMatching(/^\$2b\$/),
          expiresAt: expect.any(Date),
        }),
      );
    });

    it('should sign a new JWT with user id, role, sessionId, and version', async () => {
      await service.refreshTokens(RAW_REFRESH_TOKEN, IP_ADDRESS);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: USER_ID,
          role: UserRole.CUSTOMER,
          sessionId: SESSION_ID,
          version: MOCK_USER.version,
        }),
        expect.objectContaining({ expiresIn: '15m' }),
      );
    });

    it('should throw 429 when rate limit is exceeded (>10 requests/min)', async () => {
      mockRedis.incr.mockResolvedValue(11); // rate limit exceeded

      await expect(service.refreshTokens(RAW_REFRESH_TOKEN, IP_ADDRESS)).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
      });
    });

    it('should trigger TOKEN REUSE DETECTION and revoke ALL user sessions if token matches a rotated/old session', async () => {
      // No active session matches
      mockPrisma.userSession.findMany = jest
        .fn()
        .mockResolvedValueOnce([]) // active sessions query
        .mockResolvedValueOnce([
          { id: 'old-session-123', userId: USER_ID, refreshTokenHash: validRefreshHash, user: { role: UserRole.CUSTOMER } },
        ]); // all sessions query for reuse check

      mockSessionRepo.revokeAllUserSessions = jest.fn().mockResolvedValue(2);
      mockPrisma.auditLog = { create: jest.fn().mockResolvedValue({}) };

      await expect(service.refreshTokens(RAW_REFRESH_TOKEN, IP_ADDRESS)).rejects.toMatchObject({
        status: HttpStatus.UNAUTHORIZED,
        message: 'Invalid or expired refresh token',
      });

      expect(mockSessionRepo.revokeAllUserSessions).toHaveBeenCalledWith(USER_ID);
    });

    it('should throw 401 when no session matches the raw token at all', async () => {
      mockPrisma.userSession.findMany = jest
        .fn()
        .mockResolvedValueOnce([]) // no active session
        .mockResolvedValueOnce([]); // no historical session

      await expect(service.refreshTokens(RAW_REFRESH_TOKEN, IP_ADDRESS)).rejects.toMatchObject({
        status: HttpStatus.UNAUTHORIZED,
        message: 'Invalid or expired refresh token',
      });
    });

    it('should throw 401 when raw token is not in valid UUID format', async () => {
      await expect(service.refreshTokens('not-a-uuid', IP_ADDRESS)).rejects.toMatchObject({
        status: HttpStatus.UNAUTHORIZED,
        message: 'Invalid or expired refresh token',
      });
    });

    it('should throw 401 when user account is inactive', async () => {
      const inactiveSession = {
        ...ACTIVE_SESSION,
        user: { ...MOCK_USER, isActive: false },
      };
      mockPrisma.userSession.findMany = jest.fn().mockResolvedValue([inactiveSession]);

      await expect(service.refreshTokens(RAW_REFRESH_TOKEN, IP_ADDRESS)).rejects.toMatchObject({
        status: HttpStatus.UNAUTHORIZED,
      });
    });
  });

  // ─── logout() ───────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('should revoke single session when session exists, belongs to user, and is active', async () => {
      mockSessionRepo.findById = jest.fn().mockResolvedValue({
        ...MOCK_SESSION,
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockSessionRepo.revokeSession = jest.fn().mockResolvedValue(undefined);
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(SALON_OWNER_USER);
      mockPrisma.auditLog = { create: jest.fn().mockResolvedValue({}) };

      const result = await service.logout(USER_ID, SESSION_ID, IP_ADDRESS);

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(mockSessionRepo.revokeSession).toHaveBeenCalledWith(SESSION_ID);
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should return success gracefully even if session does not exist (already deleted)', async () => {
      mockSessionRepo.findById = jest.fn().mockResolvedValue(null);

      const result = await service.logout(USER_ID, SESSION_ID, IP_ADDRESS);

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(mockSessionRepo.revokeSession).not.toHaveBeenCalled();
    });

    it('should return success gracefully when session is expired', async () => {
      mockSessionRepo.findById = jest.fn().mockResolvedValue({
        ...MOCK_SESSION,
        expiresAt: new Date(Date.now() - 3600000), // expired
      });

      const result = await service.logout(USER_ID, SESSION_ID, IP_ADDRESS);

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(mockSessionRepo.revokeSession).not.toHaveBeenCalled();
    });
  });

  // ─── logoutAllDevices() ────────────────────────────────────────────────────

  describe('logoutAllDevices()', () => {
    it('should revoke all user sessions, increment token version, and write audit log', async () => {
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(SALON_OWNER_USER);
      mockSessionRepo.revokeAllUserSessions = jest.fn().mockResolvedValue(3);
      mockPrisma.user.update = jest.fn().mockResolvedValue({});
      mockPrisma.auditLog = { create: jest.fn().mockResolvedValue({}) };

      const result = await service.logoutAllDevices(USER_ID, IP_ADDRESS);

      expect(result).toEqual({ message: 'Logged out from all devices successfully' });
      expect(mockSessionRepo.revokeAllUserSessions).toHaveBeenCalledWith(USER_ID);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { version: { increment: 1 } },
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });
  });

  // ─── getActiveSessions() ────────────────────────────────────────────────────

  describe('getActiveSessions()', () => {
    it('should return active sessions, flag current session, and omit sensitive fields like refreshTokenHash', async () => {
      const activeSession1 = {
        ...MOCK_SESSION,
        id: SESSION_ID,
        expiresAt: new Date(Date.now() + 3600000),
      };
      const activeSession2 = {
        ...MOCK_SESSION,
        id: 'other-session-456',
        deviceId: 'device-002',
        expiresAt: new Date(Date.now() + 7200000),
      };
      const expiredSession = {
        ...MOCK_SESSION,
        id: 'expired-session-789',
        expiresAt: new Date(Date.now() - 3600000),
      };

      mockSessionRepo.findUserSessions = jest
        .fn()
        .mockResolvedValue([activeSession1, activeSession2, expiredSession]);

      const result = await service.getActiveSessions(USER_ID, SESSION_ID);

      expect(result).toHaveLength(2); // excludes expired session
      expect(result[0]).toEqual({
        id: SESSION_ID,
        deviceId: 'device-001',
        userAgent: USER_AGENT,
        ipAddress: IP_ADDRESS,
        createdAt: activeSession1.createdAt,
        expiresAt: activeSession1.expiresAt,
        isCurrent: true,
      });
      expect(result[1]).toEqual(
        expect.objectContaining({
          id: 'other-session-456',
          isCurrent: false,
        }),
      );
      expect((result[0] as Record<string, unknown>).refreshTokenHash).toBeUndefined();
    });
  });

  // ─── revokeSession() ────────────────────────────────────────────────────────

  describe('revokeSession()', () => {
    it('should revoke target session when it belongs to user and is active', async () => {
      const targetSession = {
        ...MOCK_SESSION,
        id: 'target-session-123',
        userId: USER_ID,
        expiresAt: new Date(Date.now() + 3600000),
      };
      mockSessionRepo.findById = jest.fn().mockResolvedValue(targetSession);
      mockSessionRepo.revokeSession = jest.fn().mockResolvedValue(undefined);
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(SALON_OWNER_USER);
      mockPrisma.auditLog = { create: jest.fn().mockResolvedValue({}) };

      const result = await service.revokeSession(USER_ID, 'target-session-123', IP_ADDRESS);

      expect(result).toEqual({ message: 'Session revoked successfully' });
      expect(mockSessionRepo.revokeSession).toHaveBeenCalledWith('target-session-123');
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should throw 404 when session belongs to another user', async () => {
      const otherUserSession = {
        ...MOCK_SESSION,
        id: 'other-user-session',
        userId: 'another-user-uuid',
        expiresAt: new Date(Date.now() + 3600000),
      };
      mockSessionRepo.findById = jest.fn().mockResolvedValue(otherUserSession);

      await expect(
        service.revokeSession(USER_ID, 'other-user-session', IP_ADDRESS),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        message: 'Session not found',
      });
    });

    it('should throw 404 when session does not exist', async () => {
      mockSessionRepo.findById = jest.fn().mockResolvedValue(null);

      await expect(
        service.revokeSession(USER_ID, 'non-existent-session', IP_ADDRESS),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        message: 'Session not found',
      });
    });

    it('should throw 404 when target session has already expired', async () => {
      const expiredSession = {
        ...MOCK_SESSION,
        id: 'expired-session-123',
        userId: USER_ID,
        expiresAt: new Date(Date.now() - 3600000),
      };
      mockSessionRepo.findById = jest.fn().mockResolvedValue(expiredSession);

      await expect(
        service.revokeSession(USER_ID, 'expired-session-123', IP_ADDRESS),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        message: 'Session not found',
      });
    });
  });

  // ─── forgotPassword() ───────────────────────────────────────────────────────

  describe('forgotPassword()', () => {
    const FORGOT_DTO = { email: 'owner@glamoursalon.in' };
    const GENERIC_MSG =
      'If an eligible account is associated with this email, a password reset link has been sent.';

    beforeEach(() => {
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue({
        ...SALON_OWNER_USER,
        email: FORGOT_DTO.email,
        role: UserRole.SALON_OWNER,
        isActive: true,
      });
      mockRedis.get.mockResolvedValue(null); // no existing token
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.del.mockResolvedValue(1);
      mockQueue.dispatch = jest.fn().mockResolvedValue({ id: 'job-123' });
      mockPrisma.auditLog = { create: jest.fn().mockResolvedValue({}) };
    });

    it('should return generic success message and dispatch email job for valid B2B user', async () => {
      const result = await service.forgotPassword(FORGOT_DTO, IP_ADDRESS);

      expect(result).toEqual({ message: GENERIC_MSG });
      expect(mockRedis.set).toHaveBeenCalledTimes(2); // token hash + user token tracking
      expect(mockQueue.dispatch).toHaveBeenCalledWith(
        'notification.email',
        'email.password_reset',
        expect.objectContaining({
          email: FORGOT_DTO.email,
          token: expect.stringMatching(/^[a-f0-9]{64}$/),
          userId: USER_ID,
        }),
        { attempts: 3 },
      );
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should return identical generic message and NOT send email for non-existent account', async () => {
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(null);

      const result = await service.forgotPassword({ email: 'unknown@test.com' }, IP_ADDRESS);

      expect(result).toEqual({ message: GENERIC_MSG });
      expect(mockRedis.set).not.toHaveBeenCalled();
      expect(mockQueue.dispatch).not.toHaveBeenCalled();
    });

    it('should return identical generic message and NOT send email for CUSTOMER role', async () => {
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue({
        ...MOCK_USER,
        email: 'customer@test.com',
        role: UserRole.CUSTOMER,
      });

      const result = await service.forgotPassword({ email: 'customer@test.com' }, IP_ADDRESS);

      expect(result).toEqual({ message: GENERIC_MSG });
      expect(mockQueue.dispatch).not.toHaveBeenCalled();
    });

    it('should invalidate any previous active reset token for the user before setting a new one', async () => {
      mockRedis.get.mockResolvedValue('previous-token-hash-123');

      await service.forgotPassword(FORGOT_DTO, IP_ADDRESS);

      expect(mockRedis.del).toHaveBeenCalledWith(
        'password:reset:previous-token-hash-123',
        `password:reset:user:${USER_ID}`,
      );
    });
  });

  // ─── resetPassword() ────────────────────────────────────────────────────────

  describe('resetPassword()', () => {
    const RAW_RESET_TOKEN = 'a3d9f2c1b04e724d8593c17b2d6e0f9a128c4e5f6d7b8a9102c3d4e5f6a7b8c9';
    const RESET_DTO = { token: RAW_RESET_TOKEN, newPassword: 'NewS3cure!Pass' };

    beforeEach(() => {
      mockRedis.get.mockResolvedValue({ userId: USER_ID });
      mockRedis.del.mockResolvedValue(1);
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue({
        ...SALON_OWNER_USER,
        version: 1,
        isActive: true,
      });
      mockPrisma.user.update = jest.fn().mockResolvedValue({});
      mockSessionRepo.revokeAllUserSessions = jest.fn().mockResolvedValue(2);
      mockPrisma.auditLog = { create: jest.fn().mockResolvedValue({}) };
    });

    it('should update password with bcrypt salt 12, increment token version, revoke all sessions, and delete token', async () => {
      const result = await service.resetPassword(RESET_DTO, IP_ADDRESS);

      expect(result.message).toContain('Password has been reset successfully');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: {
          passwordHash: expect.stringMatching(/^\$2b\$12\$/),
          version: { increment: 1 },
        },
      });
      expect(mockRedis.del).toHaveBeenCalled();
      expect(mockSessionRepo.revokeAllUserSessions).toHaveBeenCalledWith(USER_ID);
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should throw 401 when reset token is invalid or expired (not found in Redis)', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(service.resetPassword(RESET_DTO, IP_ADDRESS)).rejects.toMatchObject({
        status: HttpStatus.UNAUTHORIZED,
        message: 'Invalid or expired password reset token',
      });
    });

    it('should throw 401 and delete token when user is inactive', async () => {
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue({
        ...SALON_OWNER_USER,
        isActive: false,
      });

      await expect(service.resetPassword(RESET_DTO, IP_ADDRESS)).rejects.toMatchObject({
        status: HttpStatus.UNAUTHORIZED,
      });
      expect(mockRedis.del).toHaveBeenCalled();
    });
  });

  // ─── changePassword() ───────────────────────────────────────────────────────

  describe('changePassword()', () => {
    let validCurrentHash: string;
    const CURRENT_PASSWORD = 'CurrentP@ss1';
    const NEW_PASSWORD = 'UpdatedS3cure!Pass';
    const CHANGE_DTO = { oldPassword: CURRENT_PASSWORD, newPassword: NEW_PASSWORD };

    beforeEach(async () => {
      const bcrypt = await import('bcrypt');
      validCurrentHash = await bcrypt.hash(CURRENT_PASSWORD, 12);

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue({
        ...SALON_OWNER_USER,
        passwordHash: validCurrentHash,
        version: 1,
        isActive: true,
      });
      mockPrisma.user.update = jest.fn().mockResolvedValue({});
      mockPrisma.userSession.deleteMany = jest.fn().mockResolvedValue({ count: 2 });
      mockPrisma.auditLog = { create: jest.fn().mockResolvedValue({}) };
    });

    it('should change password, increment version, revoke other sessions, and keep current session active', async () => {
      const result = await service.changePassword(USER_ID, SESSION_ID, CHANGE_DTO, IP_ADDRESS);

      expect(result.message).toContain('Password updated successfully');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: {
          passwordHash: expect.stringMatching(/^\$2b\$12\$/),
          version: { increment: 1 },
        },
      });
      expect(mockPrisma.userSession.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: USER_ID,
          NOT: { id: SESSION_ID },
        },
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should throw 401 when old password is incorrect', async () => {
      const wrongDto = { oldPassword: 'WrongPassword123!', newPassword: NEW_PASSWORD };

      await expect(
        service.changePassword(USER_ID, SESSION_ID, wrongDto, IP_ADDRESS),
      ).rejects.toMatchObject({
        status: HttpStatus.UNAUTHORIZED,
        message: 'Current password is incorrect',
      });
    });

    it('should throw 400 when new password equals current password', async () => {
      const sameDto = { oldPassword: CURRENT_PASSWORD, newPassword: CURRENT_PASSWORD };

      await expect(
        service.changePassword(USER_ID, SESSION_ID, sameDto, IP_ADDRESS),
      ).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
        message: 'New password must be different from current password',
      });
    });

    it('should throw 401 when user is inactive', async () => {
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue({
        ...SALON_OWNER_USER,
        isActive: false,
      });

      await expect(
        service.changePassword(USER_ID, SESSION_ID, CHANGE_DTO, IP_ADDRESS),
      ).rejects.toMatchObject({
        status: HttpStatus.UNAUTHORIZED,
      });
    });
  });
});



