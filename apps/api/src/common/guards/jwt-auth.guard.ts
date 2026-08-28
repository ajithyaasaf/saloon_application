import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JWT_STRATEGY_NAME } from '../../domains/auth/strategies/jwt.strategy';

/**
 * JwtAuthGuard — global default guard that protects all routes.
 *
 * Architecture ref: Phase 5 §6.2, Phase 7 §3
 *
 * Behaviour:
 *  1. Checks the `isPublic` metadata flag (set by @Public()).
 *     If present, short-circuits and allows the request through.
 *  2. For all other routes, delegates to `AuthGuard('jwt')` which invokes
 *     JwtStrategy under the hood:
 *      - Extracts Bearer token from `Authorization` header.
 *      - Verifies JWT signature (HS256) and expiry.
 *      - Validates payload shape.
 *      - Attaches validated `JwtPayload` to `request.user`.
 *  3. Converts Passport's authentication failure into a structured
 *     `UnauthorizedException` so GlobalExceptionFilter can serialize it.
 *
 * Applied globally in AppModule as `APP_GUARD`.
 * No database calls. No token generation. Pure access enforcement.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard(JWT_STRATEGY_NAME) {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  /**
   * Determines whether the incoming request may proceed.
   *
   * Short-circuits for `@Public()` routes before invoking Passport.
   * For protected routes, delegates to `AuthGuard('jwt').canActivate()`
   * which triggers JwtStrategy.
   *
   * @param context - NestJS execution context.
   * @returns `true` to allow, `false` to deny, or an Observable.
   */
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  /**
   * Called by Passport when authentication fails (invalid/missing token).
   *
   * Overriding this hook converts Passport's raw error or `false` result
   * into a NestJS `UnauthorizedException` that flows through
   * `GlobalExceptionFilter` and is serialized into the standard error envelope.
   *
   * We deliberately do NOT include error detail in the message to avoid
   * leaking information about token structure or validation rules.
   *
   * @param err  - Error thrown by Passport (or `null`).
   * @param user - Authenticated user (or `false` on failure).
   * @throws `UnauthorizedException` on any authentication failure.
   */
  handleRequest<TUser>(err: Error | null, user: TUser | false): TUser {
    if (err || !user) {
      throw new UnauthorizedException('Authentication required');
    }
    return user;
  }
}
