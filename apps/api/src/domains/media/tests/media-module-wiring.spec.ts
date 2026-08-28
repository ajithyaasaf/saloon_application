import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { STORAGE_PROVIDER_TOKEN } from '../../../infrastructure/storage/constants/storage.constants';
import { CloudflareR2StorageProvider } from '../../../infrastructure/storage/providers/cloudflare-r2.provider';
import { LocalStorageProvider } from '../../../infrastructure/storage/providers/local-storage.provider';
import { S3StorageProvider } from '../../../infrastructure/storage/providers/s3-storage.provider';
import { IStorageProvider } from '../../../infrastructure/storage/interfaces/storage-provider.interface';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import {
  MediaAccessController,
  MediaAdminController,
  MediaAssetController,
  MediaLifecycleController,
  MediaUploadController,
} from '../controllers';
import {
  FILE_SECURITY_SCANNER_TOKEN,
  IFileSecurityScanner,
} from '../interfaces/file-security-scanner.interface';
import { MediaModule } from '../media.module';
import { FileAssetRepository } from '../repositories/file-asset.repository';
import { FileAccessService } from '../services/file-access.service';
import { FileAssetAuditService } from '../services/file-asset-audit.service';
import { FileAssetCacheService } from '../services/file-asset-cache.service';
import { FileAssetService } from '../services/file-asset.service';
import { FileAuthorizationService } from '../services/file-authorization.service';
import { FileLifecycleService } from '../services/file-lifecycle.service';
import { FileUploadService } from '../services/file-upload.service';
import { NoopSecurityScannerService } from '../services/noop-security-scanner.service';

describe('Phase 20.13 — Media Module Wiring & Dependency Integration', () => {
  let moduleRef: TestingModule;

  const mockPrismaService = {
    fileAsset: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    query: jest.fn().mockResolvedValue({ logs: [], total: 0 }),
  };

  const mockCacheService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    delByPattern: jest.fn().mockResolvedValue(undefined),
  };

  const mockRedisService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    setNX: jest.fn().mockResolvedValue(true),
    getClient: jest.fn().mockReturnValue({ disconnect: jest.fn() }),
  };

  const mockEventBusService = {
    publish: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
  };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              storage: {
                provider: 'local',
                localPath: './uploads',
                publicBaseUrl: 'http://localhost:3000/uploads',
              },
            }),
          ],
        }),
        MediaModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideProvider(AuditService)
      .useValue(mockAuditService)
      .overrideProvider(CacheService)
      .useValue(mockCacheService)
      .overrideProvider(RedisService)
      .useValue(mockRedisService)
      .overrideProvider(EventBusService)
      .useValue(mockEventBusService)
      .compile();

    await moduleRef.init();
  });

  afterAll(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  describe('1. Controller Resolution & Injection', () => {
    it('should successfully resolve MediaUploadController', () => {
      const controller = moduleRef.get<MediaUploadController>(MediaUploadController);
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(MediaUploadController);
    });

    it('should successfully resolve MediaAccessController', () => {
      const controller = moduleRef.get<MediaAccessController>(MediaAccessController);
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(MediaAccessController);
    });

    it('should successfully resolve MediaAssetController', () => {
      const controller = moduleRef.get<MediaAssetController>(MediaAssetController);
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(MediaAssetController);
    });

    it('should successfully resolve MediaLifecycleController', () => {
      const controller = moduleRef.get<MediaLifecycleController>(MediaLifecycleController);
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(MediaLifecycleController);
    });

    it('should successfully resolve MediaAdminController', () => {
      const controller = moduleRef.get<MediaAdminController>(MediaAdminController);
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(MediaAdminController);
    });
  });

  describe('2. Core Domain Services Resolution', () => {
    it('should successfully resolve FileUploadService', () => {
      const service = moduleRef.get<FileUploadService>(FileUploadService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(FileUploadService);
    });

    it('should successfully resolve FileAccessService', () => {
      const service = moduleRef.get<FileAccessService>(FileAccessService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(FileAccessService);
    });

    it('should successfully resolve FileLifecycleService', () => {
      const service = moduleRef.get<FileLifecycleService>(FileLifecycleService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(FileLifecycleService);
    });

    it('should successfully resolve FileAssetService', () => {
      const service = moduleRef.get<FileAssetService>(FileAssetService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(FileAssetService);
    });

    it('should successfully resolve FileAuthorizationService', () => {
      const service = moduleRef.get<FileAuthorizationService>(FileAuthorizationService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(FileAuthorizationService);
    });

    it('should successfully resolve FileAssetAuditService', () => {
      const service = moduleRef.get<FileAssetAuditService>(FileAssetAuditService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(FileAssetAuditService);
    });

    it('should successfully resolve FileAssetCacheService', () => {
      const service = moduleRef.get<FileAssetCacheService>(FileAssetCacheService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(FileAssetCacheService);
    });
  });

  describe('3. Repository & Security Scanner Tokens', () => {
    it('should successfully resolve FileAssetRepository', () => {
      const repo = moduleRef.get<FileAssetRepository>(FileAssetRepository);
      expect(repo).toBeDefined();
      expect(repo).toBeInstanceOf(FileAssetRepository);
    });

    it('should successfully resolve NoopSecurityScannerService and FILE_SECURITY_SCANNER_TOKEN', () => {
      const scanner = moduleRef.get<IFileSecurityScanner>(FILE_SECURITY_SCANNER_TOKEN);
      expect(scanner).toBeDefined();
      expect(scanner).toBeInstanceOf(NoopSecurityScannerService);
    });
  });

  describe('4. Storage Provider DI Resolution Matrix (R2, S3, LOCAL)', () => {
    it('should resolve LocalStorageProvider via STORAGE_PROVIDER_TOKEN under local configuration', async () => {
      const provider = moduleRef.get<IStorageProvider>(STORAGE_PROVIDER_TOKEN);
      expect(provider).toBeDefined();
      expect(provider.providerName).toBe('LOCAL');
      expect(provider).toBeInstanceOf(LocalStorageProvider);
    });

    it('should resolve CloudflareR2StorageProvider via STORAGE_PROVIDER_TOKEN under R2 configuration', async () => {
      const r2Module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            load: [
              () => ({
                storage: {
                  provider: 'r2',
                  r2: {
                    accountId: 'test-account-id',
                    accessKeyId: 'test-access-key',
                    secretAccessKey: 'test-secret-key',
                    bucket: 'test-r2-bucket',
                  },
                },
              }),
            ],
          }),
          MediaModule,
        ],
      })
        .overrideProvider(PrismaService)
        .useValue(mockPrismaService)
        .overrideProvider(AuditService)
        .useValue(mockAuditService)
        .overrideProvider(CacheService)
        .useValue(mockCacheService)
        .overrideProvider(RedisService)
        .useValue(mockRedisService)
        .overrideProvider(EventBusService)
        .useValue(mockEventBusService)
        .compile();

      const r2Provider = r2Module.get<IStorageProvider>(STORAGE_PROVIDER_TOKEN);
      expect(r2Provider).toBeDefined();
      expect(r2Provider.providerName).toBe('R2');
      expect(r2Provider).toBeInstanceOf(CloudflareR2StorageProvider);

      await r2Module.close();
    });

    it('should resolve S3StorageProvider via STORAGE_PROVIDER_TOKEN under S3 configuration', async () => {
      const s3Module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            load: [
              () => ({
                storage: {
                  provider: 's3',
                  s3: {
                    region: 'us-east-1',
                    accessKeyId: 'test-access-key',
                    secretAccessKey: 'test-secret-key',
                    bucket: 'test-s3-bucket',
                  },
                },
              }),
            ],
          }),
          MediaModule,
        ],
      })
        .overrideProvider(PrismaService)
        .useValue(mockPrismaService)
        .overrideProvider(AuditService)
        .useValue(mockAuditService)
        .overrideProvider(CacheService)
        .useValue(mockCacheService)
        .overrideProvider(RedisService)
        .useValue(mockRedisService)
        .overrideProvider(EventBusService)
        .useValue(mockEventBusService)
        .compile();

      const s3Provider = s3Module.get<IStorageProvider>(STORAGE_PROVIDER_TOKEN);
      expect(s3Provider).toBeDefined();
      expect(s3Provider.providerName).toBe('S3');
      expect(s3Provider).toBeInstanceOf(S3StorageProvider);

      await s3Module.close();
    });
  });

  describe('5. Lifecycle & Event Invalidation Subscriptions', () => {
    it('should register event invalidation subscriptions on initialization exactly once', () => {
      expect(mockEventBusService.subscribe).toHaveBeenCalled();
      const subscribedEvents = (mockEventBusService.subscribe as jest.Mock).mock.calls.map(
        (call) => call[0],
      );

      expect(subscribedEvents).toContain('file.asset.uploaded.v1');
      expect(subscribedEvents).toContain('file.asset.ready.v1');
      expect(subscribedEvents).toContain('file.asset.failed.v1');
      expect(subscribedEvents).toContain('file.asset.deleted.v1');
      expect(subscribedEvents).toContain('file.asset.restored.v1');
      expect(subscribedEvents).toContain('file.asset.metadata-updated.v1');
      expect(subscribedEvents).toContain('file.asset.visibility-changed.v1');
      expect(subscribedEvents).toContain('file.asset.category-changed.v1');
    });
  });
});
