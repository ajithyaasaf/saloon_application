import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Gender, UserRole } from '@prisma/client';

import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { QueueService } from '../../../infrastructure/queue/queue.service';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { STORAGE_PROVIDER_TOKEN } from '../../../infrastructure/storage/constants/storage.constants';
import { SessionRepository } from '../../auth/repositories/session.repository';
import { UserRepository } from '../repositories/user.repository';
import { UsersService } from '../users.service';

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: jest.Mocked<UserRepository>;
  let sessionRepo: jest.Mocked<SessionRepository>;
  let prisma: jest.Mocked<PrismaService>;
  let redis: jest.Mocked<RedisService>;
  let queue: jest.Mocked<QueueService>;
  let storageProvider: any;

  const USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  const TARGET_USER_ID = 'b732e411-9a22-4c6e-8210-911e8c049012';
  const IP_ADDRESS = '127.0.0.1';

  const MOCK_USER = {
    id: USER_ID,
    phone: '9876543210',
    phoneVerified: true,
    email: 'priya@example.com',
    emailVerified: true,
    passwordHash: '$2b$12$hashed',
    firstName: 'Priya',
    lastName: 'Sharma',
    displayName: 'priya_s',
    gender: Gender.FEMALE,
    dateOfBirth: new Date('1995-06-15'),
    preferredLanguage: 'hi',
    timezone: 'Asia/Kolkata',
    marketingOptIn: false,
    role: UserRole.CUSTOMER,
    isActive: true,
    avatarMediaId: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
    createdById: null,
    updatedById: null,
    version: 1,
  };

  const MOCK_ADMIN_USER = {
    ...MOCK_USER,
    id: 'admin-uuid-1234',
    role: UserRole.SUPER_ADMIN,
  };

  beforeEach(async () => {
    const mockUserRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      updateProfile: jest.fn(),
      updatePreferences: jest.fn(),
      updateEmail: jest.fn(),
      updatePhone: jest.fn(),
      updateAvatar: jest.fn(),
      clearAvatar: jest.fn(),
      adminUpdateUser: jest.fn(),
      setActive: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      listUsers: jest.fn(),
      createMedia: jest.fn(),
      findMedia: jest.fn(),
      deleteMedia: jest.fn(),
    };

    const mockSessionRepo = {
      revokeAllUserSessions: jest.fn(),
    };

    const mockPrisma = {
      user: {
        findFirst: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      fileAsset: {
        create: jest.fn().mockImplementation(({ data }: any) =>
          Promise.resolve({ id: 'file-asset-uuid-1', ...data }),
        ),
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({ id: 'file-asset-uuid-1' }),
      },
      $transaction: jest.fn().mockImplementation((cb: any) => cb(mockPrisma)),
    };

    const mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      setNX: jest.fn().mockResolvedValue(true),
      del: jest.fn().mockResolvedValue(1),
      incr: jest.fn(),
      expire: jest.fn(),
    };

    const mockQueue = {
      dispatch: jest.fn(),
    };

    const mockConfig = {
      getOrThrow: jest.fn((key: string) => 'test'),
      get: jest.fn((key: string) => 'test'),
    };

    const mockStorageProvider = {
      providerName: 'LOCAL',
      upload: jest.fn().mockResolvedValue({
        objectKey: `users/${USER_ID}/profile/avatars/2026/08/asset-123/rand123.jpg`,
        provider: 'LOCAL',
        bucket: 'saloon-assets',
        sizeBytes: 1024,
        contentType: 'image/jpeg',
        publicUrl: 'http://localhost:3000/uploads/users/avatar.jpg',
      }),
      delete: jest.fn().mockResolvedValue(true),
      getPublicUrl: jest.fn().mockReturnValue('http://localhost:3000/uploads/users/avatar.jpg'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UserRepository, useValue: mockUserRepo },
        { provide: SessionRepository, useValue: mockSessionRepo },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: QueueService, useValue: mockQueue },
        { provide: ConfigService, useValue: mockConfig },
        { provide: STORAGE_PROVIDER_TOKEN, useValue: mockStorageProvider },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepo = module.get(UserRepository);
    sessionRepo = module.get(SessionRepository);
    prisma = module.get(PrismaService);
    redis = module.get(RedisService);
    queue = module.get(QueueService);
    storageProvider = module.get(STORAGE_PROVIDER_TOKEN);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMyProfile', () => {
    it('should return user profile DTO for active user', async () => {
      userRepo.findById.mockResolvedValue(MOCK_USER as any);

      const result = await service.getMyProfile(USER_ID);

      expect(userRepo.findById).toHaveBeenCalledWith(USER_ID);
      expect(result.id).toBe(USER_ID);
      expect(result.firstName).toBe('Priya');
      expect(result.email).toBe('priya@example.com');
      // Password hash should not exist on response DTO
      expect((result as any).passwordHash).toBeUndefined();
    });

    it('should throw NotFoundException if user is not found or inactive', async () => {
      userRepo.findById.mockResolvedValue(null);

      await expect(service.getMyProfile(USER_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateMyProfile', () => {
    it('should patch provided profile fields and record audit log', async () => {
      userRepo.findById.mockResolvedValue(MOCK_USER as any);
      userRepo.updateProfile.mockResolvedValue({
        ...MOCK_USER,
        firstName: 'Ananya',
      } as any);

      const result = await service.updateMyProfile(USER_ID, { firstName: 'Ananya' }, IP_ADDRESS);

      expect(userRepo.updateProfile).toHaveBeenCalledWith(USER_ID, { firstName: 'Ananya' });
      expect(result.firstName).toBe('Ananya');
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('updateMyPreferences', () => {
    it('should patch preferences and record audit log', async () => {
      userRepo.findById.mockResolvedValue(MOCK_USER as any);
      userRepo.updatePreferences.mockResolvedValue({
        ...MOCK_USER,
        marketingOptIn: true,
      } as any);

      const result = await service.updateMyPreferences(USER_ID, { marketingOptIn: true }, IP_ADDRESS);

      expect(userRepo.updatePreferences).toHaveBeenCalledWith(USER_ID, { marketingOptIn: true });
      expect(result.marketingOptIn).toBe(true);
    });
  });

  describe('requestAvatarUpload', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'avatar',
      originalname: 'profile.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('fake-image-bytes'),
      size: 1024,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    it('should upload avatar via IStorageProvider and create FileAsset and Media records', async () => {
      userRepo.findById.mockResolvedValue(MOCK_USER as any);
      userRepo.createMedia.mockResolvedValue({
        id: 'media-uuid-1',
        url: 'http://localhost:3000/uploads/users/avatar.jpg',
        thumbnailUrl: null,
        publicId: 'file-asset-uuid-1',
        provider: 'LOCAL',
        mimeType: 'image/jpeg',
        mediaType: 'IMAGE',
        fileSize: 1024,
        uploadedById: USER_ID,
        createdAt: new Date(),
      } as any);

      const result = await service.requestAvatarUpload(USER_ID, mockFile, IP_ADDRESS);

      expect(storageProvider.upload).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: 'image/jpeg',
          contentLength: 1024,
        }),
      );
      expect((prisma as any).fileAsset.create).toHaveBeenCalled();
      expect(userRepo.createMedia).toHaveBeenCalled();
      expect(userRepo.updateAvatar).toHaveBeenCalledWith(USER_ID, 'media-uuid-1', expect.anything());
      expect(redis.del).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should reject dangerous or executable file extensions', async () => {
      userRepo.findById.mockResolvedValue(MOCK_USER as any);

      const dangerousFile: Express.Multer.File = {
        ...mockFile,
        originalname: 'malicious.php.png.exe',
      };

      await expect(
        service.requestAvatarUpload(USER_ID, dangerousFile, IP_ADDRESS),
      ).rejects.toThrow();
    });
  });

  describe('removeAvatar', () => {
    it('should clear avatar and delete old media asset', async () => {
      const userWithAvatar = {
        ...MOCK_USER,
        avatarMediaId: 'media-uuid-1',
      };
      userRepo.findById
        .mockResolvedValueOnce(userWithAvatar as any)
        .mockResolvedValueOnce({ ...MOCK_USER, avatarMediaId: null } as any);
      userRepo.findMedia.mockResolvedValue({
        id: 'media-uuid-1',
        publicId: 'file-asset-uuid-1',
      } as any);

      const result = await service.removeAvatar(USER_ID, IP_ADDRESS);

      expect(userRepo.clearAvatar).toHaveBeenCalledWith(USER_ID, expect.anything());
      expect(userRepo.deleteMedia).toHaveBeenCalledWith('media-uuid-1');
      expect(result).toBeDefined();
    });
  });

  describe('adminUpdateUser', () => {
    it('should revoke all active sessions when admin changes user role', async () => {
      userRepo.findById.mockResolvedValue(MOCK_ADMIN_USER as any);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ ...MOCK_USER, id: TARGET_USER_ID, role: UserRole.CUSTOMER } as any);
      userRepo.adminUpdateUser.mockResolvedValue({ ...MOCK_USER, id: TARGET_USER_ID, role: UserRole.SALON_OWNER, version: 2 } as any);
      sessionRepo.revokeAllUserSessions.mockResolvedValue(1);

      const result = await service.adminUpdateUser(
        MOCK_ADMIN_USER.id,
        TARGET_USER_ID,
        { role: UserRole.SALON_OWNER },
        IP_ADDRESS,
      );

      expect(sessionRepo.revokeAllUserSessions).toHaveBeenCalledWith(TARGET_USER_ID);
      expect(result.role).toBe(UserRole.SALON_OWNER);
    });

    it('should revoke all active sessions when admin deactivates user via adminUpdateUser', async () => {
      userRepo.findById.mockResolvedValue(MOCK_ADMIN_USER as any);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ ...MOCK_USER, id: TARGET_USER_ID, isActive: true } as any);
      userRepo.adminUpdateUser.mockResolvedValue({ ...MOCK_USER, id: TARGET_USER_ID, isActive: false, version: 2 } as any);
      sessionRepo.revokeAllUserSessions.mockResolvedValue(1);

      const result = await service.adminUpdateUser(
        MOCK_ADMIN_USER.id,
        TARGET_USER_ID,
        { isActive: false },
        IP_ADDRESS,
      );

      expect(sessionRepo.revokeAllUserSessions).toHaveBeenCalledWith(TARGET_USER_ID);
      expect(result.isActive).toBe(false);
    });
  });

  describe('suspendUser', () => {
    it('should suspend user and revoke all sessions', async () => {
      userRepo.findById.mockResolvedValue(MOCK_ADMIN_USER as any);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ ...MOCK_USER, id: TARGET_USER_ID, isActive: true } as any);
      sessionRepo.revokeAllUserSessions.mockResolvedValue(2);

      const result = await service.suspendUser(MOCK_ADMIN_USER.id, TARGET_USER_ID, IP_ADDRESS);

      expect(userRepo.setActive).toHaveBeenCalledWith(TARGET_USER_ID, false, expect.anything());
      expect(sessionRepo.revokeAllUserSessions).toHaveBeenCalledWith(TARGET_USER_ID, expect.anything());
      expect(result.message).toContain('suspended');
    });
  });

  describe('softDeleteUser', () => {
    it('should throw ForbiddenException if admin attempts to delete own account', async () => {
      userRepo.findById.mockResolvedValue(MOCK_ADMIN_USER as any);

      await expect(
        service.softDeleteUser(MOCK_ADMIN_USER.id, MOCK_ADMIN_USER.id, IP_ADDRESS),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should soft-delete user and revoke sessions for target user', async () => {
      userRepo.findById.mockResolvedValue(MOCK_ADMIN_USER as any);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ ...MOCK_USER, id: TARGET_USER_ID } as any);

      const result = await service.softDeleteUser(MOCK_ADMIN_USER.id, TARGET_USER_ID, IP_ADDRESS);

      expect(userRepo.softDelete).toHaveBeenCalledWith(TARGET_USER_ID, expect.anything());
      expect(sessionRepo.revokeAllUserSessions).toHaveBeenCalledWith(TARGET_USER_ID, expect.anything());
      expect(result.message).toBe('User account has been deleted.');
    });
  });
});
