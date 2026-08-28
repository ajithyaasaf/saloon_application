import { UserRole } from '../../enums/index.js';

export interface SendOtpRequestDto {
  phone: string;
}

export interface SendOtpResponseDto {
  message: string;
  expiresInSeconds: number;
}

export interface VerifyOtpRequestDto {
  phone: string;
  otp: string;
}

export interface PasswordLoginRequestDto {
  email: string;
  password: string;
}

export interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

export interface AuthSessionUserDto {
  id: string;
  phone?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  role: UserRole;
  avatarUrl?: string | null;
  salonId?: string | null;
  branchId?: string | null;
}

export interface AuthResponseDto {
  tokens: AuthTokensDto;
  user: AuthSessionUserDto;
}

export interface RefreshTokenRequestDto {
  refreshToken: string;
}

export interface ChangePasswordRequestDto {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequestDto {
  email: string;
}

export interface ResetPasswordRequestDto {
  token: string;
  newPassword: string;
}

export interface UserSessionItemDto {
  id: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export type LoginRequestDto = PasswordLoginRequestDto;
export type OtpVerifyDto = VerifyOtpRequestDto;
export type UserSessionDto = UserSessionItemDto;
