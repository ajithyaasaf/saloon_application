import { ApiClient, ITokenStorage } from '@saloon/shared-utils';

export class SecureStoreTokenStorage implements ITokenStorage {
  private inMemoryAccess: string | null = null;
  private inMemoryRefresh: string | null = null;
  private inMemoryUser: string | null = null;

  getAccessToken(): string | null {
    return this.inMemoryAccess;
  }

  setAccessToken(token: string | null): void {
    this.inMemoryAccess = token;
  }

  getRefreshToken(): string | null {
    return this.inMemoryRefresh;
  }

  setRefreshToken(token: string | null): void {
    this.inMemoryRefresh = token;
  }

  getUserSession(): string | null {
    return this.inMemoryUser;
  }

  setUserSession(userStr: string | null): void {
    this.inMemoryUser = userStr;
  }

  clearTokens(): void {
    this.inMemoryAccess = null;
    this.inMemoryRefresh = null;
    this.inMemoryUser = null;
  }
}

export const tokenStorage = new SecureStoreTokenStorage();

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const apiClient = new ApiClient({
  baseUrl: API_BASE_URL,
  tokenStorage,
  onUnauthorized: () => {
    tokenStorage.clearTokens();
  },
});
