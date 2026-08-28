/**
 * CACHE_KEYS — Standardized key prefixes and TTL definitions for cache-aside strategy.
 *
 * Architecture ref: Phase 9.2 §7
 */
export const CACHE_KEYS = Object.freeze({
  SALON_PROFILE: (salonId: string) => `salon:profile:${salonId}`,
  SALON_SLOTS: (salonId: string, date: string) => `salon:slots:${salonId}:${date}`,
  SERVICE_CATALOG: (salonId: string) => `catalog:salon:${salonId}`,
  SERVICE_CATEGORIES: () => `catalog:service_categories`,
  SERVICE_DETAILS: (serviceId: string) => `catalog:service:${serviceId}`,
  BRANCH_SERVICES: (branchId: string) => `catalog:branch_services:${branchId}`,
  USER_PROFILE: (userId: string) => `user:profile:${userId}`,
  USER_ROLES: (userId: string) => `user:roles:${userId}`,
});

export const CACHE_TTL: Record<string, number> = Object.freeze({
  SALON_PROFILE: 3600, // 1 hour
  SALON_SLOTS: 300, // 5 minutes
  SERVICE_CATALOG: 7200, // 2 hours
  SERVICE_CATEGORIES: 86400, // 24 hours
  SERVICE_DETAILS: 43200, // 12 hours
  BRANCH_SERVICES: 3600, // 1 hour
  USER_PROFILE: 1800, // 30 minutes
  USER_ROLES: 3600, // 1 hour
  DEFAULT: 900, // 15 minutes
});
