/**
 * Standardized cache key generators and TTL definitions for the File & Media Storage Engine.
 * Conforms to Phase 20.11 §3, §4, §5, §6, §20.
 */
export const FILE_ASSET_CACHE_KEYS = Object.freeze({
  /**
   * Versioned global cache key for stable FileAsset metadata.
   */
  ASSET_BY_ID: (assetId: string) => `file:v1:asset:${assetId}`,

  /**
   * Tenant-scoped cache key for FileAsset metadata.
   */
  TENANT_ASSET: (salonId: string, assetId: string) => `file:v1:tenant:${salonId}:asset:${assetId}`,

  /**
   * User-scoped cache key for FileAsset metadata.
   */
  USER_ASSET: (userId: string, assetId: string) => `file:v1:user:${userId}:asset:${assetId}`,

  /**
   * Public CDN descriptor / public URL lookup cache key.
   */
  PUBLIC_ASSET: (assetId: string) => `file:v1:public:asset:${assetId}`,

  /**
   * Tenant summary / quota cache key.
   */
  TENANT_SUMMARY: (salonId: string) => `file:v1:tenant:${salonId}:summary`,
});

/**
 * Standardized TTL constants for File & Media cache entries (in seconds).
 */
export const FILE_ASSET_CACHE_TTL = Object.freeze({
  /** Stable READY FileAsset metadata: 1 hour */
  STABLE_METADATA: 3600,

  /** Volatile / transient state FileAsset metadata: 2 minutes */
  VOLATILE_METADATA: 120,

  /** Public URL descriptor: 30 minutes */
  PUBLIC_URL: 1800,

  /** Tenant summary: 5 minutes */
  TENANT_SUMMARY: 300,

  /** Default general TTL: 15 minutes */
  DEFAULT: 900,
});
