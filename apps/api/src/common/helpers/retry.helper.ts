import { DomainException } from '../exceptions/domain.exception';

export interface RetryOptions {
  /** Maximum retry attempts before rethrowing error (defaults to 3) */
  maxRetries?: number;
  /** Initial backoff delay in milliseconds (defaults to 100ms) */
  baseDelayMs?: number;
  /** Maximum backoff delay cap in milliseconds (defaults to 2000ms) */
  maxDelayMs?: number;
  /** Optional predicate to inspect error and decide if retry should occur */
  shouldRetry?: (error: unknown) => boolean;
}

/**
 * RetryHelper — Pure, framework-independent exponential backoff retry helper.
 *
 * Thread Safety: 100% Thread-Safe.
 * Determinism: Non-Deterministic (uses random jitter and setTimeout delay).
 * Time Complexity: O(N) where N is maxRetries.
 * Space Complexity: O(1).
 * Dependencies: DomainException (for non-retryable domain failure checks).
 *
 * RETRY POLICY:
 * - DomainException subclasses (ValidationException, BusinessException, ConflictException,
 *   UnauthorizedOperationException, ForbiddenOperationException, RateLimitExceededException)
 *   are NEVER retried.
 * - Only transient infrastructure failures (network timeouts, database connection losses) are retried.
 * - Exponential backoff is strictly capped at `maxDelayMs`.
 *
 * Architecture ref: Phase 9.1 §2 (RetryHelper)
 */
export class RetryHelper {
  /**
   * Executes an asynchronous action with exponential backoff retries.
   */
  public static async execute<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {},
  ): Promise<T> {
    const maxRetries = Math.max(0, options.maxRetries ?? 3);
    const baseDelay = Math.max(1, options.baseDelayMs ?? 100);
    const maxDelay = Math.max(baseDelay, options.maxDelayMs ?? 2000);
    const customShouldRetry = options.shouldRetry ?? (() => true);

    let attempt = 0;

    while (true) {
      try {
        return await fn();
      } catch (error) {
        attempt++;

        // Rule 9: Never retry business/domain exceptions
        const isDomainErr = error instanceof DomainException;
        const canRetry = !isDomainErr && attempt <= maxRetries && customShouldRetry(error);

        if (!canRetry) {
          throw error;
        }

        // Rule 8: Calculate exponential backoff with maxDelay cap and random jitter
        const rawExponential = baseDelay * Math.pow(2, attempt - 1);
        const cappedDelay = Math.min(rawExponential, maxDelay);
        const jitter = Math.floor(Math.random() * (cappedDelay * 0.2));
        const finalDelay = Math.min(cappedDelay + jitter, maxDelay);

        await new Promise((resolve) => setTimeout(resolve, finalDelay));
      }
    }
  }
}
