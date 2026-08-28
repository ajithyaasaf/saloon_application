import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

/**
 * Roles metadata key used by RolesGuard to read allowed roles from route metadata.
 */
export const ROLES_KEY = 'roles';

/**
 * @Roles() — decorator that specifies which roles are permitted to access a route.
 *
 * Usage:
 *   @Roles(UserRole.SALON_OWNER, UserRole.SUPER_ADMIN)
 *   @Get('my-salon')
 *   getSalon() { ... }
 *
 * If @Roles() is not applied to a route, RolesGuard passes automatically
 * (authentication via JwtAuthGuard is still enforced).
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
