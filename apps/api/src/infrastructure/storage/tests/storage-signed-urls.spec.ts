import {
  DEFAULT_SIGNED_DOWNLOAD_EXPIRY_SECONDS,
  DEFAULT_SIGNED_UPLOAD_EXPIRY_SECONDS,
  MAX_SIGNED_URL_EXPIRY_SECONDS,
  MIN_SIGNED_URL_EXPIRY_SECONDS,
} from '../constants/storage.constants';
import { LocalStorageProvider } from '../providers/local-storage.provider';

describe('Storage Signed URLs (Contract & Boundary Rules)', () => {
  let provider: LocalStorageProvider;

  beforeEach(() => {
    provider = new LocalStorageProvider({
      provider: 'LOCAL',
      r2: { bucket: 'r2' },
      s3: { region: 'us-east-1', bucket: 's3' },
      local: { baseDir: './uploads' },
    });
  });

  it('should use default expiration when expiresInSeconds is not specified', async () => {
    const uploadRes = await provider.generateSignedUploadUrl({
      objectKey: 'test/upload.png',
      contentType: 'image/png',
    });
    expect(uploadRes.expiresInSeconds).toBe(DEFAULT_SIGNED_UPLOAD_EXPIRY_SECONDS);

    const downloadRes = await provider.generateSignedDownloadUrl({
      objectKey: 'test/download.png',
    });
    expect(downloadRes.expiresInSeconds).toBe(DEFAULT_SIGNED_DOWNLOAD_EXPIRY_SECONDS);
  });

  it('should clamp expiration to MIN_SIGNED_URL_EXPIRY_SECONDS (60s) if lower', async () => {
    const res = await provider.generateSignedUploadUrl({
      objectKey: 'test/clamp-min.png',
      contentType: 'image/png',
      expiresInSeconds: 10,
    });
    expect(res.expiresInSeconds).toBe(MIN_SIGNED_URL_EXPIRY_SECONDS);
  });

  it('should clamp expiration to MAX_SIGNED_URL_EXPIRY_SECONDS (86400s) if higher', async () => {
    const res = await provider.generateSignedDownloadUrl({
      objectKey: 'test/clamp-max.png',
      expiresInSeconds: 999999,
    });
    expect(res.expiresInSeconds).toBe(MAX_SIGNED_URL_EXPIRY_SECONDS);
  });

  it('should generate distinct URLs for different object keys', async () => {
    const url1 = await provider.generateSignedDownloadUrl({ objectKey: 'file1.txt' });
    const url2 = await provider.generateSignedDownloadUrl({ objectKey: 'file2.txt' });
    expect(url1.url).not.toBe(url2.url);
  });

  it('should generate distinct URLs for upload vs download actions', async () => {
    const uploadUrl = await provider.generateSignedUploadUrl({
      objectKey: 'same-file.txt',
      contentType: 'text/plain',
    });
    const downloadUrl = await provider.generateSignedDownloadUrl({
      objectKey: 'same-file.txt',
    });
    expect(uploadUrl.url).not.toBe(downloadUrl.url);
  });
});
