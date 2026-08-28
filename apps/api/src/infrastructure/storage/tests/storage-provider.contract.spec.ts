import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { IStorageProvider } from '../interfaces/storage-provider.interface';
import { LocalStorageProvider } from '../providers/local-storage.provider';

describe('IStorageProvider Contract Test Suite', () => {
  let tempDir: string;
  let provider: IStorageProvider;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'saloon-contract-test-'));
    provider = new LocalStorageProvider({
      provider: 'LOCAL',
      r2: { bucket: 'r2' },
      s3: { region: 'us-east-1', bucket: 's3' },
      local: { baseDir: tempDir },
    });
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Cleanup
    }
  });

  it('CONTRACT: upload, download, and exists lifecycle', async () => {
    const key = 'contracts/test-1.txt';
    const content = Buffer.from('contract test data');

    expect(await provider.exists(key)).toBe(false);

    const uploadRes = await provider.upload({
      objectKey: key,
      body: content,
      contentType: 'text/plain',
    });

    expect(uploadRes.objectKey).toBe(key);
    expect(await provider.exists(key)).toBe(true);

    const downloadRes = await provider.download(key);
    expect(downloadRes.body.toString()).toBe('contract test data');
    expect(downloadRes.contentLength).toBe(content.length);

    const metadata = await provider.getMetadata(key);
    expect(metadata).not.toBeNull();
    expect(metadata?.sizeBytes).toBe(content.length);

    expect(await provider.delete(key)).toBe(true);
    expect(await provider.exists(key)).toBe(false);
  });

  it('CONTRACT: signed URLs must contain key and expiry metadata', async () => {
    const uploadUrl = await provider.generateSignedUploadUrl({
      objectKey: 'upload/doc.pdf',
      contentType: 'application/pdf',
      expiresInSeconds: 300,
    });

    expect(uploadUrl.url).toBeDefined();
    expect(uploadUrl.objectKey).toBe('upload/doc.pdf');
    expect(uploadUrl.expiresInSeconds).toBe(300);

    const downloadUrl = await provider.generateSignedDownloadUrl({
      objectKey: 'download/doc.pdf',
      expiresInSeconds: 600,
    });

    expect(downloadUrl.url).toBeDefined();
    expect(downloadUrl.objectKey).toBe('download/doc.pdf');
    expect(downloadUrl.expiresInSeconds).toBe(600);
  });
});
