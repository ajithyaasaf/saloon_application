import {
  AuthResponseDto,
  AuthTokensDto,
  ChangePasswordRequestDto,
  FileAssetDto,
  FinalizeUploadRequestDto,
  FinalizeUploadResponseDto,
  ForgotPasswordRequestDto,
  InitiatePresignedUploadRequestDto,
  InitiatePresignedUploadResponseDto,
  PasswordLoginRequestDto,
  RefreshTokenRequestDto,
  ResetPasswordRequestDto,
  SendOtpRequestDto,
  SendOtpResponseDto,
  SignedDownloadUrlResponseDto,
  UpdateFileMetadataRequestDto,
  UpdateUserProfileDto,
  UpdateUserPreferencesDto,
  UserProfileDto,
  VerifyOtpRequestDto,
} from '@saloon/shared-types';
import { ApiClient } from './api-client.js';

/**
 * Domain-specific typed API client for Authentication operations.
 */
export class AuthApiClient {
  constructor(private readonly client: ApiClient) {}

  public async sendOtp(dto: SendOtpRequestDto) {
    return this.client.post<SendOtpResponseDto>('/api/v1/auth/otp/send', dto, { skipAuth: true });
  }

  public async verifyOtp(dto: VerifyOtpRequestDto) {
    return this.client.post<AuthResponseDto>('/api/v1/auth/otp/verify', dto, { skipAuth: true });
  }

  public async loginWithPassword(dto: PasswordLoginRequestDto) {
    return this.client.post<AuthResponseDto>('/api/v1/auth/login', dto, { skipAuth: true });
  }

  public async refreshToken(dto: RefreshTokenRequestDto) {
    return this.client.post<AuthTokensDto>('/api/v1/auth/refresh', dto, {
      skipAuth: true,
      skipAutoRefresh: true,
    });
  }

  public async logout() {
    return this.client.post<void>('/api/v1/auth/logout');
  }

  public async changePassword(dto: ChangePasswordRequestDto) {
    return this.client.post<void>('/api/v1/auth/password/change', dto);
  }

  public async forgotPassword(dto: ForgotPasswordRequestDto) {
    return this.client.post<void>('/api/v1/auth/password/forgot', dto, { skipAuth: true });
  }

  public async resetPassword(dto: ResetPasswordRequestDto) {
    return this.client.post<void>('/api/v1/auth/password/reset', dto, { skipAuth: true });
  }
}

/**
 * Domain-specific typed API client for User management operations.
 */
export class UsersApiClient {
  constructor(private readonly client: ApiClient) {}

  public async getMe() {
    return this.client.get<UserProfileDto>('/api/v1/users/me');
  }

  public async updateMe(dto: UpdateUserProfileDto) {
    return this.client.patch<UserProfileDto>('/api/v1/users/me', dto);
  }

  public async updatePreferences(dto: UpdateUserPreferencesDto) {
    return this.client.patch<UserProfileDto>('/api/v1/users/me/preferences', dto);
  }
}

/**
 * Domain-specific typed API client for Phase 20/21 File & Media operations.
 */
export class MediaApiClient {
  constructor(private readonly client: ApiClient) {}

  public async initiatePresignedUpload(dto: InitiatePresignedUploadRequestDto) {
    return this.client.post<InitiatePresignedUploadResponseDto>('/api/v1/media/upload/presigned', dto);
  }

  public async finalizeUpload(assetId: string, dto?: FinalizeUploadRequestDto) {
    return this.client.post<FinalizeUploadResponseDto>(
      `/api/v1/media/upload/${assetId}/finalize`,
      dto || {},
    );
  }

  public async getAsset(assetId: string) {
    return this.client.get<FileAssetDto>(`/api/v1/media/assets/${assetId}`);
  }

  public async getSignedDownloadUrl(assetId: string) {
    return this.client.get<SignedDownloadUrlResponseDto>(`/api/v1/media/assets/${assetId}/signed-url`);
  }

  public async updateMetadata(assetId: string, dto: UpdateFileMetadataRequestDto) {
    return this.client.patch<FileAssetDto>(`/api/v1/media/assets/${assetId}/metadata`, dto);
  }

  public async deleteAsset(assetId: string) {
    return this.client.delete<void>(`/api/v1/media/assets/${assetId}`);
  }
}
