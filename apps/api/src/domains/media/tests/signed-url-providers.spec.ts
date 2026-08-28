import { CloudflareR2StorageProvider } from '../../../infrastructure/storage/providers/cloudflare-r2.provider';
import { LocalStorageProvider } from '../../../infrastructure/storage/providers/local-storage.provider';
import { S3StorageProvider } from '../../../infrastructure/storage/providers/s3-storage.provider';
import {
  DEFAULT_SIGNED_DOWNLOAD_EXPIRY_SECONDS,
  DEFAULT_SIGNED_UPLOAD_EXPIRY_SECONDS,
  MAX_SIGNED_URL_EXPIRY_SECONDS,
  MIN_SIGNED_URL_EXPIRY_SECONDS,
} from '../../../infrastructure/storage/constants/storage.constants';
import { StorageInfrastructureConfig } from '../../../infrastructure/storage/interfaces/storage-config.interface';

describe('Phase 20.6 — Signed URL Provider Contract Verification', () => {
  const mockConfig: StorageInfrastructureConfig = {
    provider: 'R2',
    r2: {
      bucket: 'saloon-test-r2',
      accountId: 'mock-account-id',
      accessKeyId: 'mock-access-key',
      secretAccessKey: 'mock-secret-key',
      publicUrl: 'https://r2.cdn.saloon.com',
    },
    s3: {
      region: 'us-east-1',
      bucket: 'saloon-test-s3',
      accessKeyId: 'mock-s3-key',
      secretAccessKey: 'mock-s3-secret',
      publicUrl: 'https://s3.amazonaws.com/saloon-test-s3',
    },
    local: {
      baseDir: './storage/test-signed',
      publicUrl: 'http://localhost:3000/media',
    },
  };

  // ─── 1. Cloudflare R2 Provider ─────────────────────────────────────────────

  describe('Cloudflare R2 Storage Provider Signed URLs', () => {
    let r2Provider: CloudflareR2StorageProvider;

    beforeEach(() => {
      r2Provider = new CloudflareR2StorageProvider({
        ...mockConfig,
        provider: 'R2',
      });
    });

    it('should generate signed upload URL with objectKey and TTL', async () => {
      const result = await r2Provider.generateSignedUploadUrl({
        objectKey: 'salons/salon-1/profile/avatar.jpg',
        contentType: 'image/jpeg',
        expiresInSeconds: 600,
      });

      expect(result.url).toBeDefined();
      expect(result.objectKey).toBe('salons/salon-1/profile/avatar.jpg');
      expect(result.expiresInSeconds).toBe(600);
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should generate signed download URL with objectKey and content-disposition', async () => {
      const result = await r2Provider.generateSignedDownloadUrl({
        objectKey: 'salons/salon-1/profile/avatar.jpg',
        filename: 'custom-avatar.jpg',
        expiresInSeconds: 1800,
      });

      expect(result.url).toBeDefined();
      expect(result.objectKey).toBe('salons/salon-1/profile/avatar.jpg');
      expect(result.expiresInSeconds).toBe(1800);
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should clamp TTL within MIN and MAX bounds in R2', async () => {
      const lowResult = await r2Provider.generateSignedUploadUrl({
        objectKey: 'salons/salon-1/profile/avatar.jpg',
        contentType: 'image/jpeg',
        expiresInSeconds: 10,
      });
      expect(lowResult.expiresInSeconds).toBe(MIN_SIGNED_URL_EXPIRY_SECONDS);

      const highResult = await r2Provider.generateSignedUploadUrl({
        objectKey: 'salons/salon-1/profile/avatar.jpg',
        contentType: 'image/jpeg',
        expiresInSeconds: 999999,
      });
      expect(highResult.expiresInSeconds).toBe(MAX_SIGNED_URL_EXPIRY_SECONDS);
    });
  });

  // ─── 2. AWS S3 Provider ───────────────────────────────────────────────────

  describe('AWS S3 Storage Provider Signed URLs', () => {
    let s3Provider: S3StorageProvider;

    beforeEach(() => {
      s3Provider = new S3StorageProvider({
        ...mockConfig,
        provider: 'S3',
      });
    });

    it('should generate signed upload URL with objectKey and TTL', async () => {
      const result = await s3Provider.generateSignedUploadUrl({
        objectKey: 'salons/salon-1/gallery/photo.png',
        contentType: 'image/png',
        expiresInSeconds: 900,
      });

      expect(result.url).toBeDefined();
      expect(result.objectKey).toBe('salons/salon-1/gallery/photo.png');
      expect(result.expiresInSeconds).toBe(900);
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should generate signed download URL with objectKey and TTL', async () => {
      const result = await s3Provider.generateSignedDownloadUrl({
        objectKey: 'salons/salon-1/gallery/photo.png',
        expiresInSeconds: 3600,
      });

      expect(result.url).toBeDefined();
      expect(result.objectKey).toBe('salons/salon-1/gallery/photo.png');
      expect(result.expiresInSeconds).toBe(3600);
      expect(result.expiresAt).toBeInstanceOf(Date);
    });
  });

  // ─── 3. Local Storage Provider ─────────────────────────────────────────────

  describe('Local Storage Provider Signed URLs with Action Binding', () => {
    let localProvider: LocalStorageProvider;

    beforeEach(() => {
      localProvider = new LocalStorageProvider({
        ...mockConfig,
        provider: 'LOCAL',
      });
    });

    it('should generate HMAC-signed upload URL bound to "upload" action', async () => {
      const result = await localProvider.generateSignedUploadUrl({
        objectKey: 'salons/salon-1/docs/invoice.pdf',
        contentType: 'application/pdf',
        expiresInSeconds: 600,
      });

      expect(result.url).toContain('/_signed/upload/salons/salon-1/docs/invoice.pdf');
      expect(result.url).toContain('sig=');
      expect(result.url).toContain('expires=');
      expect(result.expiresInSeconds).toBe(600);
    });

    it('should generate HMAC-signed download URL bound to "download" action', async () => {
      const result = await localProvider.generateSignedDownloadUrl({
        objectKey: 'salons/salon-1/docs/invoice.pdf',
        expiresInSeconds: 1200,
      });

      expect(result.url).toContain('/_signed/download/salons/salon-1/docs/invoice.pdf');
      expect(result.url).toContain('sig=');
      expect(result.url).toContain('expires=');
      expect(result.expiresInSeconds).toBe(1200);
    });

    it('should prevent action confusion: upload and download URLs produce distinct paths and signatures', async () => {
      const upload = await localProvider.generateSignedUploadUrl({
        objectKey: 'salons/salon-1/docs/invoice.pdf',
        contentType: 'application/pdf',
        expiresInSeconds: 600,
      });

      const download = await localProvider.generateSignedDownloadUrl({
        objectKey: 'salons/salon-1/docs/invoice.pdf',
        expiresInSeconds: 600,
      });

      expect(upload.url).not.toBe(download.url);
      expect(upload.url).toContain('/_signed/upload/');
      expect(download.url).toContain('/_signed/download/');
    });
  });
});
