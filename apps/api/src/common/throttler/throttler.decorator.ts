import { SkipThrottle } from '@nestjs/throttler';

/**
 * Decorator to skip all registered throttlers for exempt routes (e.g. Health checks, Webhooks).
 *
 * Usage:
 * `@SkipAllThrottlers()` at class or method level.
 */
export const SkipAllThrottlers = () =>
  SkipThrottle({
    default: true,
    otp: true,
    login: true,
    booking: true,
    search: true,
  });
