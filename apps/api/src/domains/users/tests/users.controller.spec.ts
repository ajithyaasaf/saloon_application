import { Test, TestingModule } from '@nestjs/testing';
import { Gender, UserRole } from '@prisma/client';

import { JwtPayload } from '../../auth/dto/token-payload.dto';
import { AdminListUsersDto } from '../dto/admin-list-users.dto';
import { AdminUpdateUserDto } from '../dto/admin-update-user.dto';
import { ChangeEmailDto } from '../dto/change-email.dto';
import { ChangePhoneDto } from '../dto/change-phone.dto';
import { UpdatePreferencesDto } from '../dto/update-preferences.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UserProfileDto } from '../dto/user-profile.dto';
import { PaginatedUsersDto } from '../dto/user-summary.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { VerifyPhoneDto } from '../dto/verify-phone.dto';
import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let service: jest.Mocked<UsersService>;

  const USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  const TARGET_USER_ID = 'b732e411-9a22-4c6e-8210-911e8c049012';
  const IP_ADDRESS = '127.0.0.1';

  const MOCK_JWT_PAYLOAD: JwtPayload = {
    sub: USER_ID,
    role: UserRole.CUSTOMER,
    sessionId: 'session-uuid-1234',
    version: 1,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 900,
  };

  const MOCK_ADMIN_JWT_PAYLOAD: JwtPayload = {
    ...MOCK_JWT_PAYLOAD,
    role: UserRole.SUPER_ADMIN,
  };

  const MOCK_USER_PROFILE: UserProfileDto = {
    id: USER_ID,
    firstName: 'Priya',
    lastName: 'Sharma',
    displayName: 'priya_s',
    email: 'priya@example.com',
    emailVerified: true,
    phone: '9876543210',
    phoneVerified: true,
    role: UserRole.CUSTOMER,
    isActive: true,
    gender: Gender.FEMALE,
    dateOfBirth: new Date('1995-06-15'),
    avatar: null,
    preferredLanguage: 'hi',
    timezone: 'Asia/Kolkata',
    marketingOptIn: false,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockUsersService = {
      getMyProfile: jest.fn(),
      updateMyProfile: jest.fn(),
      updateMyPreferences: jest.fn(),
      requestAvatarUpload: jest.fn(),
      removeAvatar: jest.fn(),
      requestEmailChange: jest.fn(),
      verifyEmailChange: jest.fn(),
      requestPhoneChange: jest.fn(),
      verifyPhoneChange: jest.fn(),
      requestSelfDeletion: jest.fn(),
      confirmSelfDeletion: jest.fn(),
      getUserById: jest.fn(),
      listUsers: jest.fn(),
      adminUpdateUser: jest.fn(),
      suspendUser: jest.fn(),
      restoreUser: jest.fn(),
      softDeleteUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMyProfile', () => {
    it('should delegate to service.getMyProfile with user.sub', async () => {
      service.getMyProfile.mockResolvedValue(MOCK_USER_PROFILE);

      const result = await controller.getMyProfile(MOCK_JWT_PAYLOAD);

      expect(service.getMyProfile).toHaveBeenCalledWith(USER_ID);
      expect(result).toEqual(MOCK_USER_PROFILE);
    });
  });

  describe('updateMyProfile', () => {
    it('should delegate to service.updateMyProfile', async () => {
      const dto: UpdateProfileDto = { firstName: 'Ananya' };
      service.updateMyProfile.mockResolvedValue({ ...MOCK_USER_PROFILE, firstName: 'Ananya' });

      const result = await controller.updateMyProfile(MOCK_JWT_PAYLOAD, dto, IP_ADDRESS);

      expect(service.updateMyProfile).toHaveBeenCalledWith(USER_ID, dto, IP_ADDRESS);
      expect(result.firstName).toBe('Ananya');
    });
  });

  describe('updateMyPreferences', () => {
    it('should delegate to service.updateMyPreferences', async () => {
      const dto: UpdatePreferencesDto = { marketingOptIn: true };
      service.updateMyPreferences.mockResolvedValue({ ...MOCK_USER_PROFILE, marketingOptIn: true });

      const result = await controller.updateMyPreferences(MOCK_JWT_PAYLOAD, dto, IP_ADDRESS);

      expect(service.updateMyPreferences).toHaveBeenCalledWith(USER_ID, dto, IP_ADDRESS);
      expect(result.marketingOptIn).toBe(true);
    });
  });

  describe('uploadAvatar', () => {
    it('should delegate to service.requestAvatarUpload', async () => {
      const mockFile = { buffer: Buffer.from('test') } as Express.Multer.File;
      service.requestAvatarUpload.mockResolvedValue(MOCK_USER_PROFILE);

      const result = await controller.uploadAvatar(MOCK_JWT_PAYLOAD, mockFile, IP_ADDRESS);

      expect(service.requestAvatarUpload).toHaveBeenCalledWith(USER_ID, mockFile, IP_ADDRESS);
      expect(result).toEqual(MOCK_USER_PROFILE);
    });
  });

  describe('removeAvatar', () => {
    it('should delegate to service.removeAvatar', async () => {
      service.removeAvatar.mockResolvedValue(MOCK_USER_PROFILE);

      const result = await controller.removeAvatar(MOCK_JWT_PAYLOAD, IP_ADDRESS);

      expect(service.removeAvatar).toHaveBeenCalledWith(USER_ID, IP_ADDRESS);
      expect(result).toEqual(MOCK_USER_PROFILE);
    });
  });

  describe('requestEmailChange', () => {
    it('should delegate to service.requestEmailChange', async () => {
      const dto: ChangeEmailDto = { newEmail: 'new@example.com' };
      service.requestEmailChange.mockResolvedValue({ message: 'Success' });

      const result = await controller.requestEmailChange(MOCK_JWT_PAYLOAD, dto, IP_ADDRESS);

      expect(service.requestEmailChange).toHaveBeenCalledWith(USER_ID, dto, IP_ADDRESS);
      expect(result.message).toBe('Success');
    });
  });

  describe('verifyEmailChange', () => {
    it('should delegate to service.verifyEmailChange', async () => {
      const dto: VerifyEmailDto = { token: 'a1b2c3' };
      service.verifyEmailChange.mockResolvedValue(MOCK_USER_PROFILE);

      const result = await controller.verifyEmailChange(MOCK_JWT_PAYLOAD, dto, IP_ADDRESS);

      expect(service.verifyEmailChange).toHaveBeenCalledWith(USER_ID, dto, IP_ADDRESS);
      expect(result).toEqual(MOCK_USER_PROFILE);
    });
  });

  describe('requestPhoneChange', () => {
    it('should delegate to service.requestPhoneChange', async () => {
      const dto: ChangePhoneDto = { newPhone: '9876543210' };
      service.requestPhoneChange.mockResolvedValue({ message: 'Success' });

      const result = await controller.requestPhoneChange(MOCK_JWT_PAYLOAD, dto, IP_ADDRESS);

      expect(service.requestPhoneChange).toHaveBeenCalledWith(USER_ID, dto, IP_ADDRESS);
      expect(result.message).toBe('Success');
    });
  });

  describe('verifyPhoneChange', () => {
    it('should delegate to service.verifyPhoneChange', async () => {
      const dto: VerifyPhoneDto = { otp: '123456' };
      service.verifyPhoneChange.mockResolvedValue(MOCK_USER_PROFILE);

      const result = await controller.verifyPhoneChange(MOCK_JWT_PAYLOAD, dto, IP_ADDRESS);

      expect(service.verifyPhoneChange).toHaveBeenCalledWith(USER_ID, dto, IP_ADDRESS);
      expect(result).toEqual(MOCK_USER_PROFILE);
    });
  });

  describe('requestSelfDeletion', () => {
    it('should delegate to service.requestSelfDeletion', async () => {
      service.requestSelfDeletion.mockResolvedValue({ message: 'Success' });

      const result = await controller.requestSelfDeletion(MOCK_JWT_PAYLOAD, IP_ADDRESS);

      expect(service.requestSelfDeletion).toHaveBeenCalledWith(USER_ID, IP_ADDRESS);
      expect(result.message).toBe('Success');
    });
  });

  describe('confirmSelfDeletion', () => {
    it('should delegate to service.confirmSelfDeletion', async () => {
      service.confirmSelfDeletion.mockResolvedValue({ message: 'Success' });

      const result = await controller.confirmSelfDeletion(MOCK_JWT_PAYLOAD, 'token123', IP_ADDRESS);

      expect(service.confirmSelfDeletion).toHaveBeenCalledWith(USER_ID, 'token123', IP_ADDRESS);
      expect(result.message).toBe('Success');
    });
  });

  // ─── Admin Endpoints ───────────────────────────────────────────────────────

  describe('listUsers', () => {
    it('should delegate to service.listUsers', async () => {
      const dto: AdminListUsersDto = { page: 1, limit: 10 };
      const paginated: PaginatedUsersDto = {
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        },
      };
      service.listUsers.mockResolvedValue(paginated);

      const result = await controller.listUsers(MOCK_ADMIN_JWT_PAYLOAD, dto);

      expect(service.listUsers).toHaveBeenCalledWith(USER_ID, dto);
      expect(result).toEqual(paginated);
    });
  });

  describe('getUserById', () => {
    it('should delegate to service.getUserById', async () => {
      service.getUserById.mockResolvedValue(MOCK_USER_PROFILE);

      const result = await controller.getUserById(MOCK_ADMIN_JWT_PAYLOAD, TARGET_USER_ID);

      expect(service.getUserById).toHaveBeenCalledWith(USER_ID, TARGET_USER_ID);
      expect(result).toEqual(MOCK_USER_PROFILE);
    });
  });

  describe('adminUpdateUser', () => {
    it('should delegate to service.adminUpdateUser', async () => {
      const dto: AdminUpdateUserDto = { role: UserRole.SALON_OWNER };
      service.adminUpdateUser.mockResolvedValue(MOCK_USER_PROFILE);

      const result = await controller.adminUpdateUser(
        MOCK_ADMIN_JWT_PAYLOAD,
        TARGET_USER_ID,
        dto,
        IP_ADDRESS,
      );

      expect(service.adminUpdateUser).toHaveBeenCalledWith(USER_ID, TARGET_USER_ID, dto, IP_ADDRESS);
      expect(result).toEqual(MOCK_USER_PROFILE);
    });
  });

  describe('suspendUser', () => {
    it('should delegate to service.suspendUser', async () => {
      service.suspendUser.mockResolvedValue({ message: 'Suspended' });

      const result = await controller.suspendUser(MOCK_ADMIN_JWT_PAYLOAD, TARGET_USER_ID, IP_ADDRESS);

      expect(service.suspendUser).toHaveBeenCalledWith(USER_ID, TARGET_USER_ID, IP_ADDRESS);
      expect(result.message).toBe('Suspended');
    });
  });

  describe('restoreUser', () => {
    it('should delegate to service.restoreUser', async () => {
      service.restoreUser.mockResolvedValue({ message: 'Restored' });

      const result = await controller.restoreUser(MOCK_ADMIN_JWT_PAYLOAD, TARGET_USER_ID, IP_ADDRESS);

      expect(service.restoreUser).toHaveBeenCalledWith(USER_ID, TARGET_USER_ID, IP_ADDRESS);
      expect(result.message).toBe('Restored');
    });
  });

  describe('softDeleteUser', () => {
    it('should delegate to service.softDeleteUser', async () => {
      service.softDeleteUser.mockResolvedValue({ message: 'Deleted' });

      const result = await controller.softDeleteUser(MOCK_ADMIN_JWT_PAYLOAD, TARGET_USER_ID, IP_ADDRESS);

      expect(service.softDeleteUser).toHaveBeenCalledWith(USER_ID, TARGET_USER_ID, IP_ADDRESS);
      expect(result.message).toBe('Deleted');
    });
  });
});
