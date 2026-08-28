import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { Request } from 'express';

import { JwtPayload } from '../../domains/auth/dto/token-payload.dto';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * RolesGuard — enforces role-based access control (RBAC) on protected routes.
 *
 * Architecture ref: Phase 5 §6.2, Phase 7 §3
 *
 * Behaviour:
 *  1. Reads the required roles from the `@Roles()` metadata on the route handler
 *     or controller class using `Reflector`.
 *  2. If no `@Roles()` decorator is present, the guard passes (role-agnostic routes).
 *  3. If `@Roles()` is present, reads the authenticated user's role from
 *     `request.user.role` (populated by `JwtStrategy` → `JwtAuthGuard`).
 *  4. Returns 403 Forbidden if the user's role is not in the allowed roles list.
 *
 * Applied globally in AppModule as `APP_GUARD` after JwtAuthGuard.
 * JwtAuthGuard always runs first — by the time RolesGuard executes,
 * `request.user` is guaranteed to be a valid `JwtPayload`.
 *
 * @Public() routes: JwtAuthGuard allows them through before RolesGuard is
 * evaluated. If a @Public() route also has @Roles(), the roles check will still
 * execute. Convention: do not combine @Public() and @Roles() on the same route.
 *
 * No database calls. No token generation. Pure RBAC enforcement.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /**
   * Determines whether the current user's role satisfies the @Roles() requirement.
   *
   * @param context - NestJS execution context.
   * @returns `true` when the user has sufficient role; throws 403 otherwise.
   * @throws `ForbiddenException` when the user's role is not in the allowed list.
   */
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @Roles() decorator — any authenticated user may access this route
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as JwtPayload | undefined;

    if (!user || !user.role) {
      throw new ForbiddenException('Access denied');
    }

    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      throw new ForbiddenException('Access denied');
    }

    return true;
  }
}
