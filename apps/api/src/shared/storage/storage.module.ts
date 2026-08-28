import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';

/**
 * SharedStorageModule — Exports StorageService for media upload & binary management across domains.
 */
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class SharedStorageModule {}
