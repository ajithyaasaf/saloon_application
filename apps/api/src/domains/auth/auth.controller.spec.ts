import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { JwtPayload } from './dto/token-payload.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

  const USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  const SESSION_ID = 'b732e411-9a22-4c6e-8210-911e8c049012';
  const IP_ADDRESS = '127.0.0.1';
  const USER_AGENT = 'JestTestRunner/1.0';

  const MOCK_JWT_PAYLOAD: JwtPayload = {
    sub: USER_ID,
    role: UserRole.SALON_OWNER,
    sessionId: SESSION_ID,
    version: 1,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 900,
  };

  const MOCK_AUTH_RESPONSE: AuthResponseDto = {
    accessToken: 'mock.access.token',
    refreshToken: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    expiresIn: 900,
    user: {
      id: USER_ID,
      role: UserRole.SALON_OWNER,
      firstName: 'Owner',
      lastName: 'User',
      phone: '9876543210',
      phoneVerified: true,
      email: 'owner@test.com',
      isActive: true,
      createdAt: new Date(),
    },
  };

  beforeEach(async () => {
    const mockAuthService = {
      requestOtp: jest.fn(),
      verifyOtp: jest.fn(),
      loginWithPassword: jest.fn(),
      refreshTokens: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
      changePassword: jest.fn(),
      logout: jest.fn(),
      logoutAllDevices: jest.fn(),
      logoutAll: jest.fn(),
      getActiveSessions: jest.fn(),
      revokeSession: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─── POST /auth/otp/request ──────────────────────────────────────────────────

  describe('POST /auth/otp/request', () => {
    it('should delegate to authService.requestOtp and return success message', async () => {
      const dto: SendOtpDto = { phone: '9876543210' };
      const expectedResponse = { message: 'OTP sent successfully' };
      service.requestOtp.mockResolvedValue(expectedResponse);

      const result = await controller.requestOtp(dto);

      expect(service.requestOtp).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResponse);
    });
  });

  // ─── POST /auth/otp/verify ───────────────────────────────────────────────────

  describe('POST /auth/otp/verify', () => {
    it('should delegate to authService.verifyOtp with headers & IP', async () => {
      const dto: VerifyOtpDto = {
        phone: '9876543210',
        otp: '123456',
        device: { deviceId: 'dev-001', deviceName: 'iPhone 15' },
      };
      service.verifyOtp.mockResolvedValue(MOCK_AUTH_RESPONSE);

      const result = await controller.verifyOtp(dto, USER_AGENT, IP_ADDRESS);

      expect(service.verifyOtp).toHaveBeenCalledWith(dto, USER_AGENT, IP_ADDRESS);
      expect(result).toEqual(MOCK_AUTH_RESPONSE);
    });
  });

  // ─── POST /auth/login ────────────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    it('should delegate to authService.loginWithPassword', async () => {
      const dto: LoginDto = {
        email: 'owner@test.com',
        password: 'Password123!',
        device: { deviceId: 'dev-001', deviceName: 'Chrome Browser' },
      };
      service.loginWithPassword.mockResolvedValue(MOCK_AUTH_RESPONSE);

      const result = await controller.login(dto, USER_AGENT, IP_ADDRESS);

      expect(service.loginWithPassword).toHaveBeenCalledWith(dto, USER_AGENT, IP_ADDRESS);
      expect(result).toEqual(MOCK_AUTH_RESPONSE);
    });
  });

  // ─── POST /auth/refresh ──────────────────────────────────────────────────────

  describe('POST /auth/refresh', () => {
    it('should delegate to authService.refreshTokens', async () => {
      const dto: RefreshTokenDto = { refreshToken: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' };
      service.refreshTokens.mockResolvedValue(MOCK_AUTH_RESPONSE);

      const result = await controller.refresh(dto, IP_ADDRESS);

      expect(service.refreshTokens).toHaveBeenCalledWith(dto.refreshToken, IP_ADDRESS);
      expect(result).toEqual(MOCK_AUTH_RESPONSE);
    });
  });

  // ─── POST /auth/forgot-password ─────────────────────────────────────────────

  describe('POST /auth/forgot-password', () => {
    it('should delegate to authService.forgotPassword', async () => {
      const dto: ForgotPasswordDto = { email: 'owner@test.com' };
      const expectedResponse = {
        message: 'If an eligible account is associated with this email, a password reset link has been sent.',
      };
      service.forgotPassword.mockResolvedValue(expectedResponse);

      const result = await controller.forgotPassword(dto, IP_ADDRESS);

      expect(service.forgotPassword).toHaveBeenCalledWith(dto, IP_ADDRESS);
      expect(result).toEqual(expectedResponse);
    });
  });

  // ─── POST /auth/reset-password ──────────────────────────────────────────────

  describe('POST /auth/reset-password', () => {
    it('should delegate to authService.resetPassword', async () => {
      const dto: ResetPasswordDto = {
        token: 'a3d9f2c1b04e724d8593c17b2d6e0f9a128c4e5f6d7b8a9102c3d4e5f6a7b8c9',
        newPassword: 'NewPassword123!',
      };
      const expectedResponse = {
        message: 'Password has been reset successfully. Please log in with your new password.',
      };
      service.resetPassword.mockResolvedValue(expectedResponse);

      const result = await controller.resetPassword(dto, IP_ADDRESS);

      expect(service.resetPassword).toHaveBeenCalledWith(dto, IP_ADDRESS);
      expect(result).toEqual(expectedResponse);
    });
  });

  // ─── POST /auth/change-password ─────────────────────────────────────────────

  describe('POST /auth/change-password', () => {
    it('should delegate to authService.changePassword with authenticated user payload', async () => {
      const dto: ChangePasswordDto = {
        oldPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      };
      const expectedResponse = {
        message: 'Password updated successfully. Other active sessions have been logged out.',
      };
      service.changePassword.mockResolvedValue(expectedResponse);

      const result = await controller.changePassword(MOCK_JWT_PAYLOAD, dto, IP_ADDRESS);

      expect(service.changePassword).toHaveBeenCalledWith(USER_ID, SESSION_ID, dto, IP_ADDRESS);
      expect(result).toEqual(expectedResponse);
    });
  });

  // ─── POST /auth/logout ───────────────────────────────────────────────────────

  describe('POST /auth/logout', () => {
    it('should delegate to authService.logout', async () => {
      const expectedResponse = { message: 'Logged out successfully' };
      service.logout.mockResolvedValue(expectedResponse);

      const result = await controller.logout(MOCK_JWT_PAYLOAD, IP_ADDRESS);

      expect(service.logout).toHaveBeenCalledWith(USER_ID, SESSION_ID, IP_ADDRESS);
      expect(result).toEqual(expectedResponse);
    });
  });

  // ─── POST /auth/logout-all ───────────────────────────────────────────────────

  describe('POST /auth/logout-all', () => {
    it('should delegate to authService.logoutAllDevices', async () => {
      const expectedResponse = { message: 'Logged out from all devices successfully' };
      service.logoutAllDevices.mockResolvedValue(expectedResponse);

      const result = await controller.logoutAll(MOCK_JWT_PAYLOAD, IP_ADDRESS);

      expect(service.logoutAllDevices).toHaveBeenCalledWith(USER_ID, IP_ADDRESS);
      expect(result).toEqual(expectedResponse);
    });
  });

  // ─── GET /auth/sessions ──────────────────────────────────────────────────────

  describe('GET /auth/sessions', () => {
    it('should delegate to authService.getActiveSessions', async () => {
      const expectedResponse = [
        {
          id: SESSION_ID,
          deviceId: 'dev-001',
          userAgent: USER_AGENT,
          ipAddress: IP_ADDRESS,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
          isCurrent: true,
        },
      ];
      service.getActiveSessions.mockResolvedValue(expectedResponse);

      const result = await controller.getSessions(MOCK_JWT_PAYLOAD);

      expect(service.getActiveSessions).toHaveBeenCalledWith(USER_ID, SESSION_ID);
      expect(result).toEqual(expectedResponse);
    });
  });

  // ─── DELETE /auth/sessions/:sessionId ───────────────────────────────────────

  describe('DELETE /auth/sessions/:sessionId', () => {
    it('should delegate to authService.revokeSession', async () => {
      const targetSessionId = 'c843f522-0b33-5d7f-9321-022f9d150123';
      const expectedResponse = { message: 'Session revoked successfully' };
      service.revokeSession.mockResolvedValue(expectedResponse);

      const result = await controller.revokeSession(targetSessionId, MOCK_JWT_PAYLOAD, IP_ADDRESS);

      expect(service.revokeSession).toHaveBeenCalledWith(USER_ID, targetSessionId, IP_ADDRESS);
      expect(result).toEqual(expectedResponse);
    });
  });
});
