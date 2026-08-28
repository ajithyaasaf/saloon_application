import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { LocalStorageProvider } from '../providers/local-storage.provider';

describe('Storage Concurrency & High Throughput', () => {
  let tempDir: string;
  let provider: LocalStorageProvider;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'saloon-concurrent-test-'));
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
      // Ignore cleanup error
    }
  });

  it('should handle 20 parallel uploads and verify their content concurrently', async () => {
    const fileCount = 20;
    const uploadPromises = Array.from({ length: fileCount }, (_, i) =>
      provider.upload({
        objectKey: `concurrent/file_${i}.txt`,
        body: Buffer.from(`Payload content for file ${i}`),
        contentType: 'text/plain',
      }),
    );

    const uploadResults = await Promise.all(uploadPromises);
    expect(uploadResults.length).toBe(fileCount);

    const downloadPromises = Array.from({ length: fileCount }, (_, i) =>
      provider.download(`concurrent/file_${i}.txt`),
    );

    const downloadResults = await Promise.all(downloadPromises);
    downloadResults.forEach((res, i) => {
      expect(res.body.toString('utf-8')).toBe(`Payload content for file ${i}`);
    });
  });

  it('should handle parallel existence checks and deletions', async () => {
    const keys = ['c1.txt', 'c2.txt', 'c3.txt', 'c4.txt', 'c5.txt'];

    await Promise.all(
      keys.map((k) =>
        provider.upload({ objectKey: k, body: Buffer.from(k), contentType: 'text/plain' }),
      ),
    );

    const existsResults = await Promise.all(keys.map((k) => provider.exists(k)));
    expect(existsResults).toEqual([true, true, true, true, true]);

    const deleteResults = await provider.deleteMany(keys);
    expect(deleteResults).toEqual([true, true, true, true, true]);

    const postDeleteExists = await Promise.all(keys.map((k) => provider.exists(k)));
    expect(postDeleteExists).toEqual([false, false, false, false, false]);
  });
});
