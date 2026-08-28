import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { STORAGE_PROVIDER_TOKEN } from '../constants/storage.constants';
import { IStorageProvider } from '../interfaces/storage-provider.interface';
import { CloudflareR2StorageProvider } from '../providers/cloudflare-r2.provider';
import { LocalStorageProvider } from '../providers/local-storage.provider';
import { S3StorageProvider } from '../providers/s3-storage.provider';
import { StorageModule } from '../storage.module';

describe('StorageModule (DI Integration)', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              storage: {
                provider: 'R2',
                r2: { bucket: 'di-test-r2' },
                s3: { bucket: 'di-test-s3', region: 'us-east-1' },
                local: { baseDir: './di-test-local' },
              },
            }),
          ],
        }),
        StorageModule,
      ],
    }).compile();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should resolve STORAGE_PROVIDER_TOKEN providing CloudflareR2StorageProvider by default', () => {
    const provider = module.get<IStorageProvider>(STORAGE_PROVIDER_TOKEN);
    expect(provider).toBeDefined();
    expect(provider.providerName).toBe('R2');
  });

  it('should export all provider classes for direct injection', () => {
    const r2 = module.get<CloudflareR2StorageProvider>(CloudflareR2StorageProvider);
    const s3 = module.get<S3StorageProvider>(S3StorageProvider);
    const local = module.get<LocalStorageProvider>(LocalStorageProvider);

    expect(r2).toBeDefined();
    expect(s3).toBeDefined();
    expect(local).toBeDefined();
  });
});
