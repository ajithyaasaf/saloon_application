export type StorageProviderType = 'R2' | 'S3' | 'LOCAL' | 'CLOUDINARY';

export interface R2StorageConfig {
  accountId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucket: string;
  endpoint?: string;
  publicUrl?: string;
}

export interface S3StorageConfig {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucket: string;
  endpoint?: string;
  publicUrl?: string;
  forcePathStyle?: boolean;
}

export interface LocalStorageConfig {
  baseDir: string;
  publicUrl?: string;
}

export interface StorageInfrastructureConfig {
  provider: StorageProviderType;
  r2: R2StorageConfig;
  s3: S3StorageConfig;
  local: LocalStorageConfig;
}
