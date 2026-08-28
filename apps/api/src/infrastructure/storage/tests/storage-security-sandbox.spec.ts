import { StorageInvalidKeyError } from '../errors/storage.errors';
import { LocalStorageProvider } from '../providers/local-storage.provider';
import { StorageSecurityUtil } from '../utils/storage-security.util';

describe('Storage Security & Path Traversal Sandbox Tests', () => {
  let provider: LocalStorageProvider;

  beforeEach(() => {
    provider = new LocalStorageProvider({
      provider: 'LOCAL',
      r2: { bucket: 'r2' },
      s3: { region: 'us-east-1', bucket: 's3' },
      local: { baseDir: './uploads' },
    });
  });

  const maliciousKeys = [
    '../secret.txt',
    '..\\secret.txt',
    'salons/../../secret.txt',
    'salons/..\\secret.txt',
    'salons/123/../../../root.txt',
    '/etc/passwd',
    'C:\\Windows\\System32\\cmd.exe',
    'salons/123\0.exe',
    'salons/123%00.exe',
    'file\x00.png',
    'file\x1F.png',
    'file\x7F.png',
    '',
    '   ',
  ];

  it.each(maliciousKeys)('should reject malicious key "%s" across all operations', async (key) => {
    expect(StorageSecurityUtil.isSafeObjectKey(key)).toBe(false);

    await expect(
      provider.upload({ objectKey: key, body: Buffer.from('bad'), contentType: 'text/plain' }),
    ).rejects.toThrow(StorageInvalidKeyError);

    await expect(provider.download(key)).rejects.toThrow(StorageInvalidKeyError);
    await expect(provider.delete(key)).rejects.toThrow(StorageInvalidKeyError);
    await expect(provider.exists(key)).rejects.toThrow(StorageInvalidKeyError);
    await expect(provider.getMetadata(key)).rejects.toThrow(StorageInvalidKeyError);
    await expect(
      provider.generateSignedUploadUrl({ objectKey: key, contentType: 'text/plain' }),
    ).rejects.toThrow(StorageInvalidKeyError);
    await expect(provider.generateSignedDownloadUrl({ objectKey: key })).rejects.toThrow(
      StorageInvalidKeyError,
    );
  });
});
