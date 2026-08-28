/**
 * auth.guard.ts — Barrel re-export.
 *
 * AppModule imports `JwtAuthGuard` and `RolesGuard` from this path.
 * Implementations live in their own files (Phase 7.4):
 *   - jwt-auth.guard.ts
 *   - roles.guard.ts
 *
 * This file ensures that all existing imports from './common/guards/auth.guard'
 * continue to resolve without modification to AppModule or any other consumer.
 */
export { JwtAuthGuard } from './jwt-auth.guard';
export { RolesGuard } from './roles.guard';
