import { ApiResponse } from '@saloon/shared-types';
import { ApiClientError } from './api-client.error.js';
import { ITokenStorage, InMemoryTokenStorage } from './token-storage.interface.js';

export interface RetryConfig {
  /** Maximum number of retry attempts for transient failures (default: 2) */
  maxRetries?: number;
  /** Initial backoff delay in milliseconds (default: 500) */
  initialDelayMs?: number;
  /** Maximum upper bound for backoff delay in milliseconds (default: 4000) */
  maxDelayMs?: number;
  /** Exponential backoff multiplier factor (default: 2) */
  backoffFactor?: number;
  /** Whether to apply full jitter between 0 and calculated delay (default: true) */
  jitter?: boolean;
  /** Custom filter to determine if an error or status should be retried */
  retryCondition?: (error: any, attempt: number) => boolean;
}

export interface RetryInfo {
  attempt: number;
  maxRetries: number;
  method: string;
  url: string;
  path: string;
  reason: string;
  delayMs: number;
  requestId?: string;
}

export interface ApiClientConfig {
  baseUrl: string;
  timeoutMs?: number;
  defaultHeaders?: Record<string, string>;
  tokenStorage?: ITokenStorage;
  refreshTokenEndpoint?: string; // Default: "/api/v1/auth/refresh"
  fetchFn?: typeof fetch;
  onUnauthorized?: () => void;
  onRefreshTokenFailure?: (error: any) => void;
  /** Global retry configuration for transient network/server failures */
  retry?: RetryConfig;
  /** Sanitized observability hook for retry events */
  onRetry?: (info: RetryInfo) => void;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, any>;
  signal?: AbortSignal;
  skipAuth?: boolean;
  skipAutoRefresh?: boolean;
  /** Per-request retry configuration override. Set to false to disable retries. */
  retry?: RetryConfig | false;
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 2,
  initialDelayMs: 500,
  maxDelayMs: 4000,
  backoffFactor: 2,
  jitter: true,
  retryCondition: () => true,
};

export class ApiClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly defaultHeaders: Record<string, string>;
  private readonly tokenStorage: ITokenStorage;
  private readonly refreshTokenEndpoint: string;
  private readonly fetchFn: typeof fetch;
  private readonly onUnauthorized?: () => void;
  private readonly onRefreshTokenFailure?: (error: any) => void;
  private readonly retryConfig: Required<RetryConfig>;
  private readonly onRetry?: (info: RetryInfo) => void;

  // Single-flight refresh token mutex / promise
  private refreshPromise: Promise<string | null> | null = null;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.timeoutMs = config.timeoutMs ?? 30000;
    this.defaultHeaders = config.defaultHeaders ?? {};
    this.tokenStorage = config.tokenStorage ?? new InMemoryTokenStorage();
    this.refreshTokenEndpoint = config.refreshTokenEndpoint ?? '/api/v1/auth/refresh';
    this.fetchFn = config.fetchFn ?? (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : (null as any));
    this.onUnauthorized = config.onUnauthorized;
    this.onRefreshTokenFailure = config.onRefreshTokenFailure;
    this.onRetry = config.onRetry;

    this.retryConfig = {
      maxRetries: config.retry?.maxRetries ?? DEFAULT_RETRY_CONFIG.maxRetries,
      initialDelayMs: config.retry?.initialDelayMs ?? DEFAULT_RETRY_CONFIG.initialDelayMs,
      maxDelayMs: config.retry?.maxDelayMs ?? DEFAULT_RETRY_CONFIG.maxDelayMs,
      backoffFactor: config.retry?.backoffFactor ?? DEFAULT_RETRY_CONFIG.backoffFactor,
      jitter: config.retry?.jitter ?? DEFAULT_RETRY_CONFIG.jitter,
      retryCondition: config.retry?.retryCondition ?? DEFAULT_RETRY_CONFIG.retryCondition,
    };

    if (!this.fetchFn) {
      throw new Error('ApiClient requires a global fetch or a custom fetchFn provided in config');
    }
  }

  public getTokenStorage(): ITokenStorage {
    return this.tokenStorage;
  }

  public async get<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path, undefined, options);
  }

  public async post<T>(path: string, body?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, body, options);
  }

  public async put<T>(path: string, body?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path, body, options);
  }

  public async patch<T>(path: string, body?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', path, body, options);
  }

  public async delete<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path, undefined, options);
  }

  public async upload<T>(
    path: string,
    formData: FormData,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, formData, {
      ...options,
      headers: {
        ...(options?.headers || {}),
      },
    });
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any,
    options: RequestOptions = {},
  ): Promise<ApiResponse<T>> {
    // Abort safety check #1: If caller signal was already aborted, exit immediately
    if (options.signal?.aborted) {
      throw new ApiClientError({
        message: 'Request was aborted prior to execution',
        statusCode: 0,
        errorCode: 'REQUEST_ABORTED',
        path,
      });
    }

    const url = this.buildUrl(path, options.params);
    const headers = await this.buildHeaders(options, body);

    const isIdempotentMethod = ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
    const hasIdempotencyKey = Boolean(
      headers['Idempotency-Key'] ||
      headers['idempotency-key'] ||
      headers['X-Idempotency-Key'] ||
      headers['x-idempotency-key']
    );
    const isRetryPermitted = isIdempotentMethod || hasIdempotencyKey;

    const retryOptions = options.retry;
    const retryEnabled = retryOptions !== false;
    const activeRetryConfig: Required<RetryConfig> = {
      maxRetries: retryEnabled
        ? (typeof retryOptions === 'object' && retryOptions.maxRetries !== undefined
            ? retryOptions.maxRetries
            : this.retryConfig.maxRetries)
        : 0,
      initialDelayMs: typeof retryOptions === 'object' && retryOptions.initialDelayMs !== undefined
        ? retryOptions.initialDelayMs
        : this.retryConfig.initialDelayMs,
      maxDelayMs: typeof retryOptions === 'object' && retryOptions.maxDelayMs !== undefined
        ? retryOptions.maxDelayMs
        : this.retryConfig.maxDelayMs,
      backoffFactor: typeof retryOptions === 'object' && retryOptions.backoffFactor !== undefined
        ? retryOptions.backoffFactor
        : this.retryConfig.backoffFactor,
      jitter: typeof retryOptions === 'object' && retryOptions.jitter !== undefined
        ? retryOptions.jitter
        : this.retryConfig.jitter,
      retryCondition: typeof retryOptions === 'object' && retryOptions.retryCondition
        ? retryOptions.retryCondition
        : this.retryConfig.retryCondition,
    };

    const maxRetries = isRetryPermitted && retryEnabled ? activeRetryConfig.maxRetries : 0;

    let lastError: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      // Abort safety check #2: Check signal state before each attempt
      if (options.signal?.aborted) {
        throw new ApiClientError({
          message: 'Request was aborted',
          statusCode: 0,
          errorCode: 'REQUEST_ABORTED',
          path,
        });
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      // Link external abort signal if provided
      let onExternalAbort: (() => void) | undefined;
      if (options.signal) {
        onExternalAbort = () => controller.abort();
        options.signal.addEventListener('abort', onExternalAbort, { once: true });
      }

      let response: Response;
      try {
        const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
        const requestInit: RequestInit = {
          method,
          headers,
          signal: controller.signal,
          body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
        };

        response = await this.fetchFn(url, requestInit);
      } catch (err: any) {
        clearTimeout(timer);
        if (options.signal && onExternalAbort) {
          options.signal.removeEventListener('abort', onExternalAbort);
        }

        // Caller aborted -> do NOT classify as transient network error, immediately abort
        if (options.signal?.aborted) {
          throw new ApiClientError({
            message: 'Request was aborted',
            statusCode: 0,
            errorCode: 'REQUEST_ABORTED',
            path,
          });
        }

        const isTimeout = err.name === 'AbortError' || err.code === 20;
        const clientError = isTimeout
          ? new ApiClientError({
              message: `Request timed out after ${this.timeoutMs}ms`,
              statusCode: 408,
              errorCode: 'REQUEST_TIMEOUT',
              path,
            })
          : new ApiClientError({
              message: err.message || 'Network request failed',
              statusCode: 0,
              errorCode: 'NETWORK_ERROR',
              path,
            });

        lastError = clientError;

        // Check if we should retry transient network error
        const isTransient = this.isTransientNetworkError(err, isTimeout);
        const shouldRetry =
          attempt < maxRetries &&
          isTransient &&
          activeRetryConfig.retryCondition(clientError, attempt);

        if (shouldRetry) {
          const delayMs = this.calculateDelay(attempt, activeRetryConfig, null);
          this.emitRetryEvent({
            attempt: attempt + 1,
            maxRetries,
            method,
            url,
            path,
            reason: isTimeout ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR',
            delayMs,
            requestId: headers['x-request-id'],
          });

          await this.sleep(delayMs, options.signal);
          continue;
        }

        throw clientError;
      } finally {
        clearTimeout(timer);
        if (options.signal && onExternalAbort) {
          options.signal.removeEventListener('abort', onExternalAbort);
        }
      }

      // Handle 401 Unauthorized with token refresh coalescing (auth lifecycle interceptor)
      if (response.status === 401 && !options.skipAuth && !options.skipAutoRefresh) {
        const refreshed = await this.executeTokenRefresh();
        if (refreshed) {
          // Retry the request with new token (prevent infinite refresh loops)
          return this.request<T>(method, path, body, {
            ...options,
            skipAutoRefresh: true,
          });
        } else {
          if (this.onUnauthorized) {
            this.onUnauthorized();
          }
        }
      }

      // Handle transient server errors (502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout, or 429 with Retry-After)
      const isTransientHttp = this.isTransientStatusCode(response.status);
      if (isTransientHttp && attempt < maxRetries) {
        const retryAfterHeader = response.headers?.get ? response.headers.get('retry-after') : null;
        const retryAfterMs = this.parseRetryAfter(retryAfterHeader);

        // For 429 Too Many Requests: Only retry if server provided a valid Retry-After within maxDelayMs
        if (response.status === 429 && (retryAfterMs === null || retryAfterMs > activeRetryConfig.maxDelayMs)) {
          return this.parseResponse<T>(response, path);
        }

        const delayMs = this.calculateDelay(attempt, activeRetryConfig, retryAfterMs);
        this.emitRetryEvent({
          attempt: attempt + 1,
          maxRetries,
          method,
          url,
          path,
          reason: `HTTP_${response.status}`,
          delayMs,
          requestId: (response.headers?.get && response.headers.get('x-request-id')) || headers['x-request-id'],
        });

        await this.sleep(delayMs, options.signal);
        continue;
      }

      // Return or throw standardized response
      return this.parseResponse<T>(response, path);
    }

    if (lastError) {
      throw lastError;
    }

    throw new ApiClientError({
      message: 'Request failed after maximum retry attempts',
      statusCode: 0,
      errorCode: 'RETRIES_EXHAUSTED',
      path,
    });
  }

  private isTransientNetworkError(err: any, isTimeout: boolean): boolean {
    if (isTimeout) return true;
    const msg = String(err?.message || '').toLowerCase();
    const code = String(err?.code || '').toUpperCase();
    return (
      msg.includes('fetch') ||
      msg.includes('network') ||
      msg.includes('failed to fetch') ||
      msg.includes('connection') ||
      msg.includes('econnrefused') ||
      msg.includes('econnreset') ||
      msg.includes('etimedout') ||
      code === 'ECONNRESET' ||
      code === 'ECONNREFUSED' ||
      code === 'ETIMEDOUT' ||
      code === 'ENOTFOUND'
    );
  }

  private isTransientStatusCode(status: number): boolean {
    // Specifically allow 502, 503, 504 and 429 (rate-limiting). Exclude 500 (app bug), 501, 505.
    return status === 502 || status === 503 || status === 504 || status === 429;
  }

  private parseRetryAfter(headerValue: string | null): number | null {
    if (!headerValue) return null;
    const seconds = Number(headerValue);
    if (!isNaN(seconds) && seconds >= 0) {
      return seconds * 1000;
    }
    const dateMs = Date.parse(headerValue);
    if (!isNaN(dateMs)) {
      const diff = dateMs - Date.now();
      return diff > 0 ? diff : 0;
    }
    return null;
  }

  private calculateDelay(
    attempt: number,
    config: Required<RetryConfig>,
    retryAfterMs: number | null,
  ): number {
    if (retryAfterMs !== null && retryAfterMs !== undefined) {
      return Math.min(Math.max(0, retryAfterMs), config.maxDelayMs);
    }

    const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffFactor, attempt);
    const boundedDelay = Math.min(exponentialDelay, config.maxDelayMs);

    if (!config.jitter) {
      return boundedDelay;
    }

    // Full jitter: uniformly random between 0 and boundedDelay
    return Math.floor(Math.random() * (boundedDelay + 1));
  }

  private sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        return reject(
          new ApiClientError({
            message: 'Request was aborted',
            statusCode: 0,
            errorCode: 'REQUEST_ABORTED',
            path: '',
          }),
        );
      }

      const timer = setTimeout(() => {
        if (signal) signal.removeEventListener('abort', onAbort);
        resolve();
      }, ms);

      const onAbort = () => {
        clearTimeout(timer);
        reject(
          new ApiClientError({
            message: 'Request was aborted',
            statusCode: 0,
            errorCode: 'REQUEST_ABORTED',
            path: '',
          }),
        );
      };

      if (signal) {
        signal.addEventListener('abort', onAbort, { once: true });
      }
    });
  }

  private emitRetryEvent(info: RetryInfo): void {
    if (this.onRetry) {
      try {
        this.onRetry(info);
      } catch {
        // Observability hook must never throw or disrupt execution
      }
    }
  }

  private async executeTokenRefresh(): Promise<boolean> {
    if (this.refreshPromise) {
      const token = await this.refreshPromise;
      return !!token;
    }

    this.refreshPromise = (async () => {
      try {
        const refreshToken = await this.tokenStorage.getRefreshToken();
        if (!refreshToken) {
          await this.tokenStorage.clearTokens();
          return null;
        }

        const refreshUrl = this.buildUrl(this.refreshTokenEndpoint);
        const res = await this.fetchFn(refreshUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (!res.ok) {
          await this.tokenStorage.clearTokens();
          return null;
        }

        const data: any = await res.json();
        const newAccessToken = data?.data?.tokens?.accessToken || data?.tokens?.accessToken || data?.accessToken;
        const newRefreshToken = data?.data?.tokens?.refreshToken || data?.tokens?.refreshToken || data?.refreshToken;

        if (newAccessToken) {
          await this.tokenStorage.setAccessToken(newAccessToken);
          if (newRefreshToken) {
            await this.tokenStorage.setRefreshToken(newRefreshToken);
          }
          return newAccessToken;
        }

        await this.tokenStorage.clearTokens();
        return null;
      } catch (err) {
        await this.tokenStorage.clearTokens();
        if (this.onRefreshTokenFailure) {
          this.onRefreshTokenFailure(err);
        }
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    const result = await this.refreshPromise;
    return !!result;
  }

  private async parseResponse<T>(response: Response, path: string): Promise<ApiResponse<T>> {
    let json: any = null;
    const text = await response.text();
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { message: text };
    }

    if (!response.ok) {
      const headerRequestId =
        response.headers && typeof response.headers.get === 'function'
          ? response.headers.get('x-request-id')
          : undefined;

      throw new ApiClientError({
        message: json.message || response.statusText || 'API Error',
        statusCode: response.status,
        errorCode: json.errorCode || `HTTP_${response.status}`,
        details: json.details,
        path: json.path || path,
        requestId: json.requestId || headerRequestId || undefined,
        rawResponse: json,
      });
    }

    return json as ApiResponse<T>;
  }

  private buildUrl(path: string, params?: Record<string, any>): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${cleanPath}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach((v) => url.searchParams.append(key, String(v)));
          } else {
            url.searchParams.append(key, String(value));
          }
        }
      });
    }

    return url.toString();
  }

  private async buildHeaders(options: RequestOptions, body?: any): Promise<Record<string, string>> {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...this.defaultHeaders,
      ...(options.headers || {}),
    };

    if (!options.skipAuth) {
      const token = await this.tokenStorage.getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    if (!headers['x-request-id']) {
      headers['x-request-id'] = this.generateRequestId();
    }

    return headers;
  }

  private generateRequestId(): string {
    return 'req_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
  }
}

