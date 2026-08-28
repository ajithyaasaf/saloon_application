import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { StorageModule } from '../../infrastructure/storage/storage.module';
import { SharedModule } from '../../shared/shared.module';

// Controllers
import {
  MediaAccessController,
  MediaAdminController,
  MediaAssetController,
  MediaLifecycleController,
  MediaUploadController,
} from './controllers';

// Repositories
import { FileAssetRepository } from './repositories/file-asset.repository';

// Services & Interfaces
import { FILE_SECURITY_SCANNER_TOKEN } from './interfaces/file-security-scanner.interface';
import { FileAccessService } from './services/file-access.service';
import { FileAssetAuditService } from './services/file-asset-audit.service';
import { FileAssetCacheService } from './services/file-asset-cache.service';
import { FileAssetService } from './services/file-asset.service';
import { FileAuthorizationService } from './services/file-authorization.service';
import { FileLifecycleService } from './services/file-lifecycle.service';
import { FileUploadService } from './services/file-upload.service';
import { NoopSecurityScannerService } from './services/noop-security-scanner.service';

/**
 * MediaModule — NestJS module for the File & Media Storage Engine.
 *
 * Encapsulates:
 *  - 5 REST Controllers (Upload, Access, Asset, Lifecycle, Admin)
 *  - 7 Core Business & Infrastructure Services (Upload, Access, Lifecycle, Asset, Authz, Audit, Cache)
 *  - FileAssetRepository for multi-tenant, soft-deleted asset persistence
 *  - Pluggable Security Scanner (defaults to NoopSecurityScannerService via FILE_SECURITY_SCANNER_TOKEN)
 *  - Integration with StorageModule (IStorageProvider / STORAGE_PROVIDER_TOKEN)
 *  - Integration with SharedModule (AuditService, EventBusService, CacheService, TransactionService)
 */
@Module({
  imports: [
    DatabaseModule,
    StorageModule,
    SharedModule,
  ],
  controllers: [
    MediaUploadController,
    MediaAccessController,
    MediaAssetController,
    MediaLifecycleController,
    MediaAdminController,
  ],
  providers: [
    // Persistence Layer
    FileAssetRepository,

    // Core Security & Authorization
    FileAuthorizationService,

    // Security Scanner Provider
    NoopSecurityScannerService,
    {
      provide: FILE_SECURITY_SCANNER_TOKEN,
      useExisting: NoopSecurityScannerService,
    },

    // Audit & Event Coordinator
    FileAssetAuditService,

    // Cache-Aside Coordinator with Single-Flight Stampede Protection
    FileAssetCacheService,

    // Core Domain Business Services
    FileUploadService,
    FileAccessService,
    FileLifecycleService,
    FileAssetService,
  ],
  exports: [
    // Exported for cross-domain integration (e.g. Salon, Staff, Review media attachments)
    FileUploadService,
    FileAccessService,
    FileLifecycleService,
    FileAssetService,
    FileAuthorizationService,
    FileAssetAuditService,
    FileAssetCacheService,
    FileAssetRepository,
    FILE_SECURITY_SCANNER_TOKEN,
    NoopSecurityScannerService,
  ],
})
export class MediaModule {}
