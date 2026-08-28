import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  SessionRepository,
  CreateSessionData,
  UpdateRefreshTokenData,
} from './session.repository';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const USER_ID = 'a3d9f2c1-b04e-724d-8593-c17b2d6e0f9a';
const SESSION_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const DEVICE_ID = 'device-001';
const TOKEN_HASH = '$2b$12$hashedRefreshToken';
const NEW_TOKEN_HASH = '$2b$12$newHashedRefreshToken';

const FUTURE_DATE = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
const PAST_DATE = new Date(Date.now() - 60 * 1000); // 1 minute ago

const mockSession = {
  id: SESSION_ID,
  userId: USER_ID,
  refreshTokenHash: TOKEN_HASH,
  deviceId: DEVICE_ID,
  userAgent: 'Mozilla/5.0',
  ipAddress: '192.168.1.1',
  expiresAt: FUTURE_DATE,
  createdAt: new Date('2024-01-15T10:30:00.000Z'),
};

// ─── Prisma Mock ──────────────────────────────────────────────────────────────

/**
 * Factory function that returns a partial mock of PrismaService
 * exposing only the `userSession` delegate methods used by SessionRepository.
 *
 * Each method is a jest.fn() so individual tests can override return values
 * without affecting other tests.
 */
function createPrismaMock() {
  return {
    userSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('SessionRepository', () => {
  let repository: SessionRepository;
  let prismaMock: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionRepository,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    repository = module.get<SessionRepository>(SessionRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── createSession ─────────────────────────────────────────────────────────

  describe('createSession()', () => {
    const createData: CreateSessionData = {
      userId: USER_ID,
      refreshTokenHash: TOKEN_HASH,
      deviceId: DEVICE_ID,
      userAgent: 'Mozilla/5.0',
      ipAddress: '192.168.1.1',
      expiresAt: FUTURE_DATE,
    };

    it('should create and return a new session', async () => {
      prismaMock.userSession.create.mockResolvedValue(mockSession);

      const result = await repository.createSession(createData);

      expect(prismaMock.userSession.create).toHaveBeenCalledWith({
        data: {
          userId: USER_ID,
          refreshTokenHash: TOKEN_HASH,
          deviceId: DEVICE_ID,
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.1',
          expiresAt: FUTURE_DATE,
        },
      });
      expect(result).toEqual(mockSession);
    });

    it('should default userAgent and ipAddress to null when omitted', async () => {
      const dataWithoutOptionals: CreateSessionData = {
        userId: USER_ID,
        refreshTokenHash: TOKEN_HASH,
        deviceId: DEVICE_ID,
        expiresAt: FUTURE_DATE,
      };
      prismaMock.userSession.create.mockResolvedValue({
        ...mockSession,
        userAgent: null,
        ipAddress: null,
      });

      await repository.createSession(dataWithoutOptionals);

      expect(prismaMock.userSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userAgent: null,
            ipAddress: null,
          }),
        }),
      );
    });

    it('should use the provided transaction client instead of default prisma', async () => {
      const txMock = {
        userSession: {
          create: jest.fn().mockResolvedValue(mockSession),
        },
      } as unknown as Prisma.TransactionClient;

      await repository.createSession(createData, txMock);

      expect(txMock.userSession.create).toHaveBeenCalled();
      expect(prismaMock.userSession.create).not.toHaveBeenCalled();
    });
  });

  // ─── findById ──────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return a session when found', async () => {
      prismaMock.userSession.findUnique.mockResolvedValue(mockSession);

      const result = await repository.findById(SESSION_ID);

      expect(prismaMock.userSession.findUnique).toHaveBeenCalledWith({
        where: { id: SESSION_ID },
      });
      expect(result).toEqual(mockSession);
    });

    it('should return null when session does not exist', async () => {
      prismaMock.userSession.findUnique.mockResolvedValue(null);

      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
    });

    it('should use the provided transaction client', async () => {
      const txMock = {
        userSession: {
          findUnique: jest.fn().mockResolvedValue(mockSession),
        },
      } as unknown as Prisma.TransactionClient;

      await repository.findById(SESSION_ID, txMock);

      expect(txMock.userSession.findUnique).toHaveBeenCalled();
      expect(prismaMock.userSession.findUnique).not.toHaveBeenCalled();
    });
  });

  // ─── findByRefreshTokenHash ────────────────────────────────────────────────

  describe('findByRefreshTokenHash()', () => {
    it('should return a session matching the token hash', async () => {
      prismaMock.userSession.findFirst.mockResolvedValue(mockSession);

      const result = await repository.findByRefreshTokenHash(TOKEN_HASH);

      expect(prismaMock.userSession.findFirst).toHaveBeenCalledWith({
        where: { refreshTokenHash: TOKEN_HASH },
      });
      expect(result).toEqual(mockSession);
    });

    it('should return null when no session matches the hash', async () => {
      prismaMock.userSession.findFirst.mockResolvedValue(null);

      const result = await repository.findByRefreshTokenHash('invalid-hash');

      expect(result).toBeNull();
    });
  });

  // ─── findActiveSession ─────────────────────────────────────────────────────

  describe('findActiveSession()', () => {
    it('should return the most recent active session for user+device', async () => {
      prismaMock.userSession.findFirst.mockResolvedValue(mockSession);

      const result = await repository.findActiveSession(USER_ID, DEVICE_ID);

      expect(prismaMock.userSession.findFirst).toHaveBeenCalledWith({
        where: {
          userId: USER_ID,
          deviceId: DEVICE_ID,
          expiresAt: { gt: expect.any(Date) },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockSession);
    });

    it('should return null when no active session exists for the device', async () => {
      prismaMock.userSession.findFirst.mockResolvedValue(null);

      const result = await repository.findActiveSession(USER_ID, 'unknown-device');

      expect(result).toBeNull();
    });
  });

  // ─── findUserSessions ──────────────────────────────────────────────────────

  describe('findUserSessions()', () => {
    it('should return all sessions for a user ordered newest-first', async () => {
      const sessions = [mockSession, { ...mockSession, id: 'session-2' }];
      prismaMock.userSession.findMany.mockResolvedValue(sessions);

      const result = await repository.findUserSessions(USER_ID);

      expect(prismaMock.userSession.findMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(2);
    });

    it('should return an empty array when the user has no sessions', async () => {
      prismaMock.userSession.findMany.mockResolvedValue([]);

      const result = await repository.findUserSessions(USER_ID);

      expect(result).toEqual([]);
    });
  });

  // ─── updateRefreshToken ────────────────────────────────────────────────────

  describe('updateRefreshToken()', () => {
    const updateData: UpdateRefreshTokenData = {
      refreshTokenHash: NEW_TOKEN_HASH,
      expiresAt: FUTURE_DATE,
    };

    it('should update the refresh token hash and expiry', async () => {
      const updatedSession = { ...mockSession, refreshTokenHash: NEW_TOKEN_HASH };
      prismaMock.userSession.update.mockResolvedValue(updatedSession);

      const result = await repository.updateRefreshToken(SESSION_ID, updateData);

      expect(prismaMock.userSession.update).toHaveBeenCalledWith({
        where: { id: SESSION_ID },
        data: {
          refreshTokenHash: NEW_TOKEN_HASH,
          expiresAt: FUTURE_DATE,
        },
      });
      expect(result.refreshTokenHash).toBe(NEW_TOKEN_HASH);
    });

    it('should propagate Prisma P2025 when session id does not exist', async () => {
      const prismaError = new (require('@prisma/client').Prisma.PrismaClientKnownRequestError)(
        'Record not found',
        { code: 'P2025', clientVersion: '5.15.0', meta: {} },
      );
      prismaMock.userSession.update.mockRejectedValue(prismaError);

      await expect(
        repository.updateRefreshToken('non-existent-id', updateData),
      ).rejects.toMatchObject({ code: 'P2025' });
    });

    it('should use the provided transaction client for atomic rotation', async () => {
      const updatedSession = { ...mockSession, refreshTokenHash: NEW_TOKEN_HASH };
      const txMock = {
        userSession: {
          update: jest.fn().mockResolvedValue(updatedSession),
        },
      } as unknown as Prisma.TransactionClient;

      await repository.updateRefreshToken(SESSION_ID, updateData, txMock);

      expect(txMock.userSession.update).toHaveBeenCalled();
      expect(prismaMock.userSession.update).not.toHaveBeenCalled();
    });
  });

  // ─── ensureSessionIsActive ──────────────────────────────────────────────────

  describe('ensureSessionIsActive()', () => {
    it('should return the session if it exists and has not expired', async () => {
      prismaMock.userSession.findFirst.mockResolvedValue(mockSession);

      const result = await repository.ensureSessionIsActive(SESSION_ID);

      expect(prismaMock.userSession.findFirst).toHaveBeenCalledWith({
        where: {
          id: SESSION_ID,
          expiresAt: { gt: expect.any(Date) },
        },
      });
      expect(result).toEqual(mockSession);
    });

    it('should return null if the session has expired', async () => {
      prismaMock.userSession.findFirst.mockResolvedValue(null);

      const result = await repository.ensureSessionIsActive(SESSION_ID);

      expect(result).toBeNull();
    });

    it('should return null if the session does not exist', async () => {
      prismaMock.userSession.findFirst.mockResolvedValue(null);

      const result = await repository.ensureSessionIsActive('non-existent-id');

      expect(result).toBeNull();
    });
  });

  // ─── revokeSession ─────────────────────────────────────────────────────────

  describe('revokeSession()', () => {
    it('should delete the session row and return void', async () => {
      prismaMock.userSession.delete.mockResolvedValue(mockSession);

      await repository.revokeSession(SESSION_ID);

      expect(prismaMock.userSession.delete).toHaveBeenCalledWith({
        where: { id: SESSION_ID },
      });
    });

    it('should propagate Prisma P2025 when session does not exist', async () => {
      const prismaError = new (require('@prisma/client').Prisma.PrismaClientKnownRequestError)(
        'Record not found',
        { code: 'P2025', clientVersion: '5.15.0', meta: {} },
      );
      prismaMock.userSession.delete.mockRejectedValue(prismaError);

      await expect(repository.revokeSession('non-existent-id')).rejects.toMatchObject({
        code: 'P2025',
      });
    });

    it('should use the provided transaction client', async () => {
      const txMock = {
        userSession: {
          delete: jest.fn().mockResolvedValue(mockSession),
        },
      } as unknown as Prisma.TransactionClient;

      await repository.revokeSession(SESSION_ID, txMock);

      expect(txMock.userSession.delete).toHaveBeenCalled();
      expect(prismaMock.userSession.delete).not.toHaveBeenCalled();
    });
  });

  // ─── revokeAllUserSessions ─────────────────────────────────────────────────

  describe('revokeAllUserSessions()', () => {
    it('should delete all sessions for a user and return the count', async () => {
      prismaMock.userSession.deleteMany.mockResolvedValue({ count: 3 });

      const count = await repository.revokeAllUserSessions(USER_ID);

      expect(prismaMock.userSession.deleteMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
      });
      expect(count).toBe(3);
    });

    it('should return 0 when the user has no active sessions', async () => {
      prismaMock.userSession.deleteMany.mockResolvedValue({ count: 0 });

      const count = await repository.revokeAllUserSessions(USER_ID);

      expect(count).toBe(0);
    });

    it('should use the provided transaction client for emergency bulk revocation', async () => {
      const txMock = {
        userSession: {
          deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
      } as unknown as Prisma.TransactionClient;

      const count = await repository.revokeAllUserSessions(USER_ID, txMock);

      expect(txMock.userSession.deleteMany).toHaveBeenCalled();
      expect(prismaMock.userSession.deleteMany).not.toHaveBeenCalled();
      expect(count).toBe(2);
    });
  });

  // ─── deleteExpiredSessions ─────────────────────────────────────────────────

  describe('deleteExpiredSessions()', () => {
    it('should delete all expired sessions and return the count', async () => {
      prismaMock.userSession.deleteMany.mockResolvedValue({ count: 12 });

      const count = await repository.deleteExpiredSessions();

      expect(prismaMock.userSession.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: { lt: expect.any(Date) },
        },
      });
      expect(count).toBe(12);
    });

    it('should return 0 when no sessions have expired', async () => {
      prismaMock.userSession.deleteMany.mockResolvedValue({ count: 0 });

      const count = await repository.deleteExpiredSessions();

      expect(count).toBe(0);
    });

    it('should use the provided transaction client', async () => {
      const txMock = {
        userSession: {
          deleteMany: jest.fn().mockResolvedValue({ count: 5 }),
        },
      } as unknown as Prisma.TransactionClient;

      await repository.deleteExpiredSessions(txMock);

      expect(txMock.userSession.deleteMany).toHaveBeenCalled();
      expect(prismaMock.userSession.deleteMany).not.toHaveBeenCalled();
    });
  });
});
