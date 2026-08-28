import { ConfigService } from '@nestjs/config';
import { CloudflareR2StorageProvider } from '../providers/cloudflare-r2.provider';
import { LocalStorageProvider } from '../providers/local-storage.provider';
import { S3StorageProvider } from '../providers/s3-storage.provider';
import { StorageProviderFactory } from '../storage.factory';

describe('StorageProviderFactory', () => {
  let mockConfigService: Partial<ConfigService>;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'storage.provider') return 'R2';
        if (key === 'storage.r2.bucket') return 'test-r2';
        if (key === 'storage.s3.bucket') return 'test-s3';
        if (key === 'storage.local.baseDir') return './test-uploads';
        return undefined;
      }),
    };
  });

  it('should create CloudflareR2StorageProvider by default or when provider is R2', () => {
    const provider = StorageProviderFactory.create(
      mockConfigService as ConfigService,
    );
    expect(provider).toBeInstanceOf(CloudflareR2StorageProvider);
    expect(provider.providerName).toBe('R2');
  });

  it('should create S3StorageProvider when provider is S3', () => {
    (mockConfigService.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'storage.provider') return 'S3';
      if (key === 'storage.s3.bucket') return 'test-s3';
      return undefined;
    });

    const provider = StorageProviderFactory.create(
      mockConfigService as ConfigService,
    );
    expect(provider).toBeInstanceOf(S3StorageProvider);
    expect(provider.providerName).toBe('S3');
  });

  it('should create LocalStorageProvider when provider is LOCAL', () => {
    (mockConfigService.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'storage.provider') return 'LOCAL';
      if (key === 'storage.local.baseDir') return './local-test';
      return undefined;
    });

    const provider = StorageProviderFactory.create(
      mockConfigService as ConfigService,
    );
    expect(provider).toBeInstanceOf(LocalStorageProvider);
    expect(provider.providerName).toBe('LOCAL');
  });

  it('should accept injected StorageInfrastructureConfig directly', () => {
    const provider = StorageProviderFactory.create(
      mockConfigService as ConfigService,
      {
        provider: 'LOCAL',
        r2: { bucket: 'r2' },
        s3: { region: 'us-east-1', bucket: 's3' },
        local: { baseDir: './direct-test' },
      },
    );

    expect(provider).toBeInstanceOf(LocalStorageProvider);
  });
});
