import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Readable } from 'stream';
import { LocalStorageProvider } from '../providers/local-storage.provider';

describe('Storage Streaming Pipeline (Contract & Integrity)', () => {
  let tempDir: string;
  let provider: LocalStorageProvider;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'saloon-stream-test-'));
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

  it('should stream large multi-chunk data without data corruption', async () => {
    const chunkCount = 100;
    const chunkData = 'A'.repeat(1024); // 1KB per chunk -> 100KB total
    const totalExpectedSize = chunkCount * 1024;

    const generator = async function* () {
      for (let i = 0; i < chunkCount; i++) {
        yield Buffer.from(chunkData);
      }
    };

    const inputStream = Readable.from(generator());

    const uploadRes = await provider.uploadStream({
      objectKey: 'large-stream/data.bin',
      body: inputStream,
      contentType: 'application/octet-stream',
    });

    expect(uploadRes.sizeBytes).toBe(totalExpectedSize);

    const downloadStreamRes = await provider.getDownloadStream('large-stream/data.bin');
    expect(downloadStreamRes.contentLength).toBe(totalExpectedSize);

    let receivedBytes = 0;
    for await (const chunk of downloadStreamRes.stream) {
      receivedBytes += chunk.length;
    }

    expect(receivedBytes).toBe(totalExpectedSize);
  });
});
