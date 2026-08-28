import { ApiClient, ITokenStorage } from '@saloon/shared-utils';

class BrowserTokenStorage implements ITokenStorage {
  private inMemoryAccess: string | null = null;
  private inMemoryRefresh: string | null = null;

  getAccessToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('saloon_admin_access_token');
    }
    return this.inMemoryAccess;
  }

  setAccessToken(token: string | null): void {
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('saloon_admin_access_token', token);
      } else {
        localStorage.removeItem('saloon_admin_access_token');
      }
    }
    this.inMemoryAccess = token;
  }

  getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('saloon_admin_refresh_token');
    }
    return this.inMemoryRefresh;
  }

  setRefreshToken(token: string | null): void {
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('saloon_admin_refresh_token', token);
      } else {
        localStorage.removeItem('saloon_admin_refresh_token');
      }
    }
    this.inMemoryRefresh = token;
  }

  clearTokens(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('saloon_admin_access_token');
      localStorage.removeItem('saloon_admin_refresh_token');
      localStorage.removeItem('saloon_admin_user_session');
    }
    this.inMemoryAccess = null;
    this.inMemoryRefresh = null;
  }
}

export const tokenStorage = new BrowserTokenStorage();

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const apiClient = new ApiClient({
  baseUrl: API_BASE_URL,
  tokenStorage,
  onUnauthorized: () => {
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login?session_expired=1';
    }
  },
});
