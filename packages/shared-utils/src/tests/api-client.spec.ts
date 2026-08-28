import { ApiClient, ApiClientError, InMemoryTokenStorage, RetryInfo } from '../client/index.js';

describe('ApiClient & Resilience / Token Refresh Interceptor', () => {
  let tokenStorage: InMemoryTokenStorage;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    tokenStorage = new InMemoryTokenStorage();
    mockFetch = jest.fn();
  });

  describe('1. Standard Requests & Auth Header Injection', () => {
    it('should initialize with base URL and send standard GET request with auth header', async () => {
      tokenStorage.setAccessToken('mock_access_token_123');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            success: true,
            statusCode: 200,
            data: { id: 'u_1', name: 'Priya' },
            timestamp: new Date().toISOString(),
          }),
      });

      const client = new ApiClient({
        baseUrl: 'https://api.saloon.test',
        tokenStorage,
        fetchFn: mockFetch as any,
      });

      const result = await client.get<{ id: string; name: string }>('/api/v1/users/me', {
        params: { includeBranches: true },
      });

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Priya');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.saloon.test/api/v1/users/me?includeBranches=true');
      expect(init.method).toBe('GET');
      expect(init.headers['Authorization']).toBe('Bearer mock_access_token_123');
      expect(init.headers['x-request-id']).toBeDefined();
    });

    it('should format errors as ApiClientError on HTTP error status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () =>
          JSON.stringify({
            success: false,
            statusCode: 404,
            errorCode: 'SALON_NOT_FOUND',
            message: 'Salon with the given ID does not exist',
            timestamp: new Date().toISOString(),
          }),
      });

      const client = new ApiClient({
        baseUrl: 'https://api.saloon.test',
        tokenStorage,
        fetchFn: mockFetch as any,
      });

      let thrownError: any = null;
      try {
        await client.get('/api/v1/salons/invalid_id');
      } catch (err: any) {
        thrownError = err;
      }

      expect(thrownError).toBeInstanceOf(ApiClientError);
      expect(thrownError.statusCode).toBe(404);
      expect(thrownError.errorCode).toBe('SALON_NOT_FOUND');
    });
  });

  describe('2. Bounded Exponential Backoff & Transient Retry Logic', () => {
    it('should retry GET on transient network failure and succeed on 2nd attempt', async () => {
      const retryEvents: RetryInfo[] = [];

      // 1st call throws network error (e.g. server cold-start / connection refused)
      mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));

      // 2nd call succeeds with 200 OK
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            success: true,
            data: { salons: [{ id: 's1', name: 'Glamour' }] },
          }),
      });

      const client = new ApiClient({
        baseUrl: 'https://api.saloon.test',
        tokenStorage,
        fetchFn: mockFetch as any,
        retry: {
          maxRetries: 2,
          initialDelayMs: 10,
          maxDelayMs: 100,
          jitter: false,
        },
        onRetry: (info) => retryEvents.push(info),
      });

      const res = await client.get<any>('/api/v1/salons');

      expect(res.success).toBe(true);
      expect(res.data.salons).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Verify retry observability event was fired
      expect(retryEvents).toHaveLength(1);
      expect(retryEvents[0].attempt).toBe(1);
      expect(retryEvents[0].reason).toBe('NETWORK_ERROR');
      expect(retryEvents[0].delayMs).toBe(10);
    });

    it('should exhaust maxRetries on persistent network failure and throw final error', async () => {
      mockFetch.mockRejectedValue(new Error('Network connection timeout'));

      const client = new ApiClient({
        baseUrl: 'https://api.saloon.test',
        tokenStorage,
        fetchFn: mockFetch as any,
        retry: {
          maxRetries: 2,
          initialDelayMs: 10,
          maxDelayMs: 100,
          jitter: false,
        },
      });

      await expect(client.get('/api/v1/salons')).rejects.toThrow(ApiClientError);
      // 1 initial attempt + 2 retries = 3 total fetch calls
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should retry on transient 502, 503, 504 status codes and succeed', async () => {
      // 1st attempt: 503 Service Unavailable (e.g. backend waking up)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        headers: new Headers({ 'x-request-id': 'req-503-test' }),
        text: async () => JSON.stringify({ message: 'Service Unavailable' }),
      });

      // 2nd attempt: 200 OK
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, data: { status: 'healthy' } }),
      });

      const client = new ApiClient({
        baseUrl: 'https://api.saloon.test',
        tokenStorage,
        fetchFn: mockFetch as any,
        retry: {
          maxRetries: 2,
          initialDelayMs: 10,
          jitter: false,
        },
      });

      const res = await client.get<any>('/api/v1/health');
      expect(res.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should NOT retry non-transient application errors (400, 403, 404, 409, 422, 500)', async () => {
      const nonTransientStatuses = [400, 403, 404, 409, 422, 500];

      for (const status of nonTransientStatuses) {
        mockFetch.mockReset();
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status,
          text: async () => JSON.stringify({ message: `Error ${status}`, errorCode: `ERR_${status}` }),
        });

        const client = new ApiClient({
          baseUrl: 'https://api.saloon.test',
          tokenStorage,
          fetchFn: mockFetch as any,
          retry: {
            maxRetries: 2,
            initialDelayMs: 10,
          },
        });

        await expect(client.get('/api/v1/test')).rejects.toThrow(ApiClientError);
        // Must fail immediately on attempt 1 without entering retry loop
        expect(mockFetch).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('3. Method Safety & Idempotency Rules', () => {
    it('should NOT retry POST request without Idempotency-Key on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error during mutation'));

      const client = new ApiClient({
        baseUrl: 'https://api.saloon.test',
        tokenStorage,
        fetchFn: mockFetch as any,
        retry: {
          maxRetries: 2,
          initialDelayMs: 10,
        },
      });

      await expect(client.post('/api/v1/bookings', { slotId: 'slot_123' })).rejects.toThrow(ApiClientError);
      // Fast-fail: Must only be called once because it lacks an Idempotency-Key
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should allow retry for POST request with Idempotency-Key header', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection reset by peer'));
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: async () => JSON.stringify({ success: true, data: { bookingId: 'b_999' } }),
      });

      const client = new ApiClient({
        baseUrl: 'https://api.saloon.test',
        tokenStorage,
        fetchFn: mockFetch as any,
        retry: {
          maxRetries: 2,
          initialDelayMs: 10,
          jitter: false,
        },
      });

      const res = await client.post<any>(
        '/api/v1/bookings',
        { slotId: 'slot_123' },
        { headers: { 'Idempotency-Key': 'idem_key_abc_123' } },
      );

      expect(res.success).toBe(true);
      expect(res.data.bookingId).toBe('b_999');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('4. Retry-After Header & Delay Clamping', () => {
    it('should respect Retry-After header in integer seconds and clamp to maxDelayMs', async () => {
      const retryEvents: RetryInfo[] = [];

      // Returns 503 with Retry-After: 2 (2000ms), but maxDelayMs is configured to 50ms
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        headers: new Headers({ 'retry-after': '2' }),
        text: async () => JSON.stringify({ message: 'Overloaded' }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, data: { ok: true } }),
      });

      const client = new ApiClient({
        baseUrl: 'https://api.saloon.test',
        tokenStorage,
        fetchFn: mockFetch as any,
        retry: {
          maxRetries: 1,
          maxDelayMs: 50, // Upper bound clamp
        },
        onRetry: (info) => retryEvents.push(info),
      });

      const res = await client.get<any>('/api/v1/data');
      expect(res.success).toBe(true);
      expect(retryEvents).toHaveLength(1);
      // Clamped to maxDelayMs (50ms) rather than waiting 2000ms
      expect(retryEvents[0].delayMs).toBe(50);
    });
  });

  describe('5. AbortSignal & Cancellation Safety', () => {
    it('should NOT dispatch any request if signal is already aborted before execution', async () => {
      const controller = new AbortController();
      controller.abort(); // Pre-aborted

      const client = new ApiClient({
        baseUrl: 'https://api.saloon.test',
        tokenStorage,
        fetchFn: mockFetch as any,
      });

      let thrownError: any;
      try {
        await client.get('/api/v1/salons', { signal: controller.signal });
      } catch (err) {
        thrownError = err;
      }

      expect(thrownError).toBeInstanceOf(ApiClientError);
      expect(thrownError.errorCode).toBe('REQUEST_ABORTED');
      // Zero HTTP requests sent
      expect(mockFetch).toHaveBeenCalledTimes(0);
    });

    it('should stop retry sequence immediately when caller aborts during backoff delay', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));

      const controller = new AbortController();

      const client = new ApiClient({
        baseUrl: 'https://api.saloon.test',
        tokenStorage,
        fetchFn: mockFetch as any,
        retry: {
          maxRetries: 3,
          initialDelayMs: 200, // Sufficient time to abort during sleep
          jitter: false,
        },
        onRetry: () => {
          // Abort caller signal during the retry delay
          controller.abort();
        },
      });

      let thrownError: any;
      try {
        await client.get('/api/v1/salons', { signal: controller.signal });
      } catch (err) {
        thrownError = err;
      }

      expect(thrownError).toBeInstanceOf(ApiClientError);
      expect(thrownError.errorCode).toBe('REQUEST_ABORTED');
      // Did NOT proceed to attempt 2 because signal was cancelled
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('6. Token Refresh Interceptor & Coalescing', () => {
    it('should perform single-flight token refresh on 401 Unauthorized and retry request', async () => {
      tokenStorage.setAccessToken('expired_access_token');
      tokenStorage.setRefreshToken('valid_refresh_token');

      // 1st call to endpoint returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ message: 'Unauthorized' }),
      });

      // 2nd call (refresh token endpoint) returns new tokens
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            tokens: {
              accessToken: 'fresh_new_access_token',
              refreshToken: 'fresh_new_refresh_token',
            },
          },
        }),
        text: async () => JSON.stringify({}),
      });

      // 3rd call (retried original endpoint) returns 200 OK
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            success: true,
            statusCode: 200,
            data: { secret: 'authenticated_data' },
            timestamp: new Date().toISOString(),
          }),
      });

      const client = new ApiClient({
        baseUrl: 'https://api.saloon.test',
        tokenStorage,
        fetchFn: mockFetch as any,
      });

      const res = await client.get<{ secret: string }>('/api/v1/protected/resource');

      expect(res.success).toBe(true);
      expect(res.data.secret).toBe('authenticated_data');

      // Verify token storage was updated
      expect(await tokenStorage.getAccessToken()).toBe('fresh_new_access_token');
      expect(await tokenStorage.getRefreshToken()).toBe('fresh_new_refresh_token');

      // Verify 3 fetch calls were made: 1st initial -> 2nd refresh -> 3rd retry with new token
      expect(mockFetch).toHaveBeenCalledTimes(3);
      const retryInit = mockFetch.mock.calls[2][1];
      expect(retryInit.headers['Authorization']).toBe('Bearer fresh_new_access_token');
    });

    it('should call onUnauthorized and clear tokens if token refresh fails', async () => {
      tokenStorage.setAccessToken('expired_access_token');
      tokenStorage.setRefreshToken('revoked_refresh_token');

      const onUnauthorized = jest.fn();

      // 1st call returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ message: 'Unauthorized' }),
      });

      // Refresh call returns 400 Bad Request
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Refresh token invalid' }),
        text: async () => JSON.stringify({ message: 'Refresh token invalid' }),
      });

      const client = new ApiClient({
        baseUrl: 'https://api.saloon.test',
        tokenStorage,
        fetchFn: mockFetch as any,
        onUnauthorized,
      });

      await expect(client.get('/api/v1/protected/resource')).rejects.toThrow(ApiClientError);

      expect(onUnauthorized).toHaveBeenCalledTimes(1);
      expect(await tokenStorage.getAccessToken()).toBeNull();
      expect(await tokenStorage.getRefreshToken()).toBeNull();
    });

    it('should coalesce multiple concurrent 401 responses into a single refresh request', async () => {
      tokenStorage.setAccessToken('expired_token');
      tokenStorage.setRefreshToken('valid_refresh_token');

      let refreshCallCount = 0;

      mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
        // Refresh endpoint call
        if (url.includes('/api/v1/auth/refresh')) {
          refreshCallCount++;
          await new Promise((r) => setTimeout(r, 20));
          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              data: {
                tokens: {
                  accessToken: 'coalesced_new_access_token',
                  refreshToken: 'coalesced_new_refresh_token',
                },
              },
            }),
            text: async () => JSON.stringify({}),
          };
        }

        // If called with the new access token, succeed
        if (init?.headers && (init.headers as any)['Authorization'] === 'Bearer coalesced_new_access_token') {
          return {
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify({
                success: true,
                statusCode: 200,
                data: { path: url },
                timestamp: new Date().toISOString(),
              }),
          };
        }

        // Initial calls with expired token return 401
        return {
          ok: false,
          status: 401,
          text: async () => JSON.stringify({ message: 'Unauthorized' }),
        };
      });

      const client = new ApiClient({
        baseUrl: 'https://api.saloon.test',
        tokenStorage,
        fetchFn: mockFetch as any,
      });

      // Fire 3 requests in parallel
      const [res1, res2, res3] = await Promise.all([
        client.get('/api/v1/resource/1'),
        client.get('/api/v1/resource/2'),
        client.get('/api/v1/resource/3'),
      ]);

      expect(res1.success).toBe(true);
      expect(res2.success).toBe(true);
      expect(res3.success).toBe(true);

      // Exactly 1 refresh request was dispatched across all 3 concurrent 401 calls
      expect(refreshCallCount).toBe(1);

      // Final tokens in storage match the rotated values
      expect(await tokenStorage.getAccessToken()).toBe('coalesced_new_access_token');
      expect(await tokenStorage.getRefreshToken()).toBe('coalesced_new_refresh_token');
    });
  });
});

