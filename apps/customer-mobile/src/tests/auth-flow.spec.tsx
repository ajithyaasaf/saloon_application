import { tokenStorage, apiClient } from '../services/api.service';
import { authService } from '../services/customer-domain.services';

describe('Customer Mobile Authentication & Token Lifecycle', () => {
  beforeEach(() => {
    tokenStorage.clearTokens();
    jest.restoreAllMocks();
  });

  it('should store and restore access tokens and session data in SecureStoreTokenStorage', () => {
    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(tokenStorage.getRefreshToken()).toBeNull();

    tokenStorage.setAccessToken('test_access_jwt');
    tokenStorage.setRefreshToken('test_refresh_jwt');
    tokenStorage.setUserSession(JSON.stringify({ id: 'cust-1', firstName: 'Aarav' }));

    expect(tokenStorage.getAccessToken()).toBe('test_access_jwt');
    expect(tokenStorage.getRefreshToken()).toBe('test_refresh_jwt');
    expect(JSON.parse(tokenStorage.getUserSession()!).firstName).toBe('Aarav');

    tokenStorage.clearTokens();
    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(tokenStorage.getRefreshToken()).toBeNull();
    expect(tokenStorage.getUserSession()).toBeNull();
  });

  it('should verify OTP and store authentication session tokens', async () => {
    jest.spyOn(apiClient, 'post').mockResolvedValueOnce({
      success: true,
      statusCode: 200,
      timestamp: new Date().toISOString(),
      data: {
        tokens: {
          accessToken: 'jwt_access_123',
          refreshToken: 'jwt_refresh_456',
        },
        user: {
          id: 'user-uuid-1',
          firstName: 'Priya',
          phone: '+919876543210',
          role: 'CUSTOMER',
        } as any,
      },
    });

    const result = await authService.verifyOtp({
      phone: '9876543210',
      otp: '123456',
    });

    expect(result.tokens?.accessToken).toBe('jwt_access_123');
    expect(tokenStorage.getAccessToken()).toBe('jwt_access_123');
    expect(tokenStorage.getRefreshToken()).toBe('jwt_refresh_456');
  });

  it('should clear stored session upon user logout', async () => {
    tokenStorage.setAccessToken('active_token');
    jest.spyOn(apiClient, 'post').mockResolvedValueOnce({
      success: true,
      statusCode: 200,
      timestamp: new Date().toISOString(),
      data: {},
    });

    await authService.logout();
    expect(tokenStorage.getAccessToken()).toBeNull();
  });
});
