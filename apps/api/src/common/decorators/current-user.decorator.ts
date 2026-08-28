import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Parameter decorator factory for @CurrentUser()
 */
export const currentUserFactory = (data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<Request>();
  const user = request.user as any;
  if (!user) return user;

  const id = user.sub ?? user.id ?? user.userId;
  const normalizedUser = {
    ...user,
    id,
    userId: id,
    sub: id,
  };

  if (typeof data === 'string') {
    if (data === 'userId' || data === 'id' || data === 'sub') {
      return id;
    }
    return normalizedUser[data];
  }

  return normalizedUser;
};

/**
 * @CurrentUser() — parameter decorator that extracts the authenticated user
 * from the JWT-guarded request context.
 *
 * Usage:
 *   @Get('me')
 *   getProfile(@CurrentUser() user: JwtPayload) { ... }
 */
export const CurrentUser = createParamDecorator(currentUserFactory);
