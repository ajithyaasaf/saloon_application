import { ApiClient } from '../client/api-client.js';
import { AuthApiClient, UsersApiClient, MediaApiClient } from '../client/domain-clients.js';
import { InMemoryTokenStorage } from '../client/token-storage.interface.js';
import { FileCategory, FileVisibility, UserRole } from '@saloon/shared-types';

describe('Domain API Clients', () => {
  let mockFetch: jest.Mock;
  let apiClient: ApiClient;
  let tokenStorage: InMemoryTokenStorage;

  beforeEach(() => {
    tokenStorage = new InMemoryTokenStorage();
    tokenStorage.setAccessToken('valid_jwt_access_token');
    mockFetch = jest.fn();

    apiClient = new ApiClient({
      baseUrl: 'https://api.saloon.test',
      tokenStorage,
      fetchFn: mockFetch as any,
    });
  });

  describe('AuthApiClient', () => {
    let authClient: AuthApiClient;

    beforeEach(() => {
      authClient = new AuthApiClient(apiClient);
    });

    it('should send OTP to phone without auth header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            success: true,
            statusCode: 200,
            data: { message: 'OTP sent', expiresInSeconds: 300 },
          }),
      });

      const res = await authClient.sendOtp({ phone: '+919876543210' });
      expect(res.data.message).toBe('OTP sent');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.saloon.test/api/v1/auth/otp/send',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ phone: '+919876543210' }),
        }),
      );
      // Verify skipAuth omitted Bearer header
      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['Authorization']).toBeUndefined();
    });

    it('should verify OTP and receive tokens', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            success: true,
            statusCode: 200,
            data: {
              tokens: { accessToken: 'acc_123', refreshToken: 'ref_123', tokenType: 'Bearer', expiresIn: 3600 },
              user: { id: 'u_1', role: UserRole.CUSTOMER, phone: '+919876543210' },
            },
          }),
      });

      const res = await authClient.verifyOtp({ phone: '+919876543210', otp: '123456' });
      expect(res.data.tokens.accessToken).toBe('acc_123');
      expect(res.data.user.role).toBe(UserRole.CUSTOMER);
    });

    it('should call logout', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, statusCode: 200, data: null }),
      });

      await authClient.logout();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.saloon.test/api/v1/auth/logout',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('UsersApiClient', () => {
    let usersClient: UsersApiClient;

    beforeEach(() => {
      usersClient = new UsersApiClient(apiClient);
    });

    it('should get current user profile with auth header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            success: true,
            statusCode: 200,
            data: {
              id: 'u_1',
              firstName: 'Priya',
              lastName: 'Sharma',
              role: UserRole.CUSTOMER,
              marketingOptIn: true,
            },
          }),
      });

      const res = await usersClient.getMe();
      expect(res.data.firstName).toBe('Priya');
      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['Authorization']).toBe('Bearer valid_jwt_access_token');
    });

    it('should update user profile', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            success: true,
            statusCode: 200,
            data: { id: 'u_1', firstName: 'Ananya' },
          }),
      });

      const res = await usersClient.updateMe({ firstName: 'Ananya' });
      expect(res.data.firstName).toBe('Ananya');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.saloon.test/api/v1/users/me',
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ firstName: 'Ananya' }) }),
      );
    });
  });

  describe('MediaApiClient (Phase 20/21 Compliance)', () => {
    let mediaClient: MediaApiClient;

    beforeEach(() => {
      mediaClient = new MediaApiClient(apiClient);
    });

    it('should initiate presigned upload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            success: true,
            statusCode: 200,
            data: {
              assetId: 'ast_123',
              uploadUrl: 'https://r2.saloon.test/upload/presigned-url',
              expiresInSeconds: 900,
              httpMethod: 'PUT',
              category: FileCategory.SALON_GALLERY,
              visibility: FileVisibility.PUBLIC,
            },
          }),
      });

      const res = await mediaClient.initiatePresignedUpload({
        category: FileCategory.SALON_GALLERY,
        fileName: 'salon-front.webp',
        mimeType: 'image/webp',
        fileSizeBytes: 1048576,
      });

      expect(res.data.assetId).toBe('ast_123');
      expect(res.data.httpMethod).toBe('PUT');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.saloon.test/api/v1/media/upload/presigned',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('should finalize upload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            success: true,
            statusCode: 200,
            data: {
              asset: { id: 'ast_123', status: 'READY' },
              status: 'READY',
            },
          }),
      });

      const res = await mediaClient.finalizeUpload('ast_123', { actualSizeBytes: 1048576 });
      expect(res.data.status).toBe('READY');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.saloon.test/api/v1/media/upload/ast_123/finalize',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('should get signed download URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            success: true,
            statusCode: 200,
            data: {
              assetId: 'ast_123',
              downloadUrl: 'https://r2.saloon.test/download/signed-url',
              expiresInSeconds: 3600,
              fileName: 'invoice-doc.pdf',
            },
          }),
      });

      const res = await mediaClient.getSignedDownloadUrl('ast_123');
      expect(res.data.downloadUrl).toContain('signed-url');
    });

    it('should delete media asset', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, statusCode: 200, data: null }),
      });

      await mediaClient.deleteAsset('ast_123');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.saloon.test/api/v1/media/assets/ast_123',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });
});
