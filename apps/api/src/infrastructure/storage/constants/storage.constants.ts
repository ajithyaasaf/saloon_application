/**
 * Storage Constants
 *
 * Provider-agnostic tokens and default values for storage infrastructure.
 */

export const STORAGE_PROVIDER_TOKEN = 'STORAGE_PROVIDER_TOKEN';
export const STORAGE_CONFIG_TOKEN = 'STORAGE_CONFIG_TOKEN';

export const DEFAULT_SIGNED_UPLOAD_EXPIRY_SECONDS = 900; // 15 minutes
export const DEFAULT_SIGNED_DOWNLOAD_EXPIRY_SECONDS = 3600; // 1 hour
export const MAX_SIGNED_URL_EXPIRY_SECONDS = 86400; // 24 hours
export const MIN_SIGNED_URL_EXPIRY_SECONDS = 60; // 1 minute
