import { BadRequestException } from '@nestjs/common';
import { FileCategory, FileStatus, FileVisibility } from '@prisma/client';
import { FileAssetEntity } from '../entities/file-asset.entity';

describe('FileAssetEntity - Domain Invariants & State Machine', () => {
  const createBaseEntity = (
    status: FileStatus = FileStatus.UPLOADING,
    visibility: FileVisibility = FileVisibility.PRIVATE,
  ) =>
    new FileAssetEntity({
      id: 'asset-123',
      salonId: 'salon-abc',
      uploadedByUserId: 'user-xyz',
      originalFileName: 'style.jpg',
      storedFileName: 'stored-style.jpg',
      objectKey: 'salons/salon-abc/gallery/style.jpg',
      bucket: 'saloon-assets',
      provider: 'R2',
      mimeType: 'image/jpeg',
      extension: 'jpg',
      sizeBytes: 50000,
      checksum: 'sha256-hash',
      status,
      visibility,
      category: FileCategory.GALLERY,
      width: 1920,
      height: 1080,
      duration: null,
      metadata: null,
      altText: 'Hair style',
      folder: 'gallery',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

  describe('Lifecycle State Transitions', () => {
    it('should transition through valid lifecycle: UPLOADING -> UPLOADED -> PROCESSING -> READY', () => {
      const entity = createBaseEntity(FileStatus.UPLOADING);
      expect(entity.isUploading()).toBe(true);

      entity.markUploaded();
      expect(entity.status).toBe(FileStatus.UPLOADED);

      entity.startProcessing();
      expect(entity.isProcessing()).toBe(true);

      entity.markReady({
        sizeBytes: 52000,
        width: 3840,
        height: 2160,
        metadata: { processedBy: 'sharp' },
      });
      expect(entity.isReady()).toBe(true);
      expect(entity.sizeBytes).toBe(52000);
      expect(entity.width).toBe(3840);
      expect(entity.metadata).toEqual({ processedBy: 'sharp' });
    });

    it('should transition to FAILED and record failure reason', () => {
      const entity = createBaseEntity(FileStatus.UPLOADING);
      entity.markFailed('Network timeout');

      expect(entity.isFailed()).toBe(true);
      expect(entity.metadata).toEqual(
        expect.objectContaining({
          failureReason: 'Network timeout',
          failedAt: expect.any(String),
        }),
      );
    });

    it('should throw BadRequestException on invalid transition from UPLOADING directly to READY', () => {
      const entity = createBaseEntity(FileStatus.UPLOADING);
      expect(() => entity.markReady()).toThrow(BadRequestException);
    });

    it('should throw BadRequestException on invalid transition from READY to UPLOADING', () => {
      const entity = createBaseEntity(FileStatus.READY);
      expect(() => (entity as any).transitionTo(FileStatus.UPLOADING)).toThrow(
        BadRequestException,
      );
    });

    it('should handle soft deletion and restoration', () => {
      const entity = createBaseEntity(FileStatus.READY);
      expect(entity.isDeleted()).toBe(false);

      entity.softDelete();
      expect(entity.isDeleted()).toBe(true);
      expect(entity.status).toBe(FileStatus.DELETED);

      entity.restore();
      expect(entity.isDeleted()).toBe(false);
      expect(entity.isReady()).toBe(true);
    });
  });

  describe('Access Control Invariants (canAccess)', () => {
    it('should grant access to platform admins unconditionally', () => {
      const entity = createBaseEntity(FileStatus.READY, FileVisibility.PRIVATE);
      expect(entity.canAccess({ userId: 'admin-1', role: 'SUPER_ADMIN' })).toBe(true);
      expect(entity.canAccess({ userId: 'admin-2', role: 'ADMIN' })).toBe(true);
    });

    it('should grant access to public files in READY status to any user', () => {
      const entity = createBaseEntity(FileStatus.READY, FileVisibility.PUBLIC);
      expect(entity.canAccess({ userId: 'anon-user' })).toBe(true);
    });

    it('should deny access to public files that are still UPLOADING or FAILED', () => {
      const uploading = createBaseEntity(FileStatus.UPLOADING, FileVisibility.PUBLIC);
      expect(uploading.canAccess({ userId: 'random-user' })).toBe(false);

      const failed = createBaseEntity(FileStatus.FAILED, FileVisibility.PUBLIC);
      expect(failed.canAccess({ userId: 'random-user' })).toBe(false);
    });

    it('should grant access to TENANT visibility only to users belonging to the same salon', () => {
      const entity = createBaseEntity(FileStatus.READY, FileVisibility.TENANT);

      // Same salon
      expect(
        entity.canAccess({ userId: 'staff-1', salonId: 'salon-abc', role: 'STAFF' }),
      ).toBe(true);

      // Different salon
      expect(
        entity.canAccess({ userId: 'staff-2', salonId: 'salon-xyz', role: 'STAFF' }),
      ).toBe(false);
    });

    it('should grant access to PRIVATE files only to the uploader or salon owners', () => {
      const entity = createBaseEntity(FileStatus.READY, FileVisibility.PRIVATE);

      // Uploader
      expect(entity.canAccess({ userId: 'user-xyz', salonId: 'salon-abc' })).toBe(
        true,
      );

      // Salon owner
      expect(
        entity.canAccess({ userId: 'owner-1', salonId: 'salon-abc', role: 'OWNER' }),
      ).toBe(true);

      // Random customer / other user
      expect(
        entity.canAccess({ userId: 'other-user', salonId: 'salon-abc', role: 'CUSTOMER' }),
      ).toBe(false);
    });
  });

  describe('Modification & Deletion Invariants (canModify / canDelete)', () => {
    it('should allow owner or uploader to modify and delete', () => {
      const entity = createBaseEntity(FileStatus.READY);

      expect(entity.canModify({ userId: 'user-xyz' })).toBe(true);
      expect(
        entity.canModify({ userId: 'owner-1', salonId: 'salon-abc', role: 'OWNER' }),
      ).toBe(true);
      expect(
        entity.canDelete({ userId: 'owner-1', salonId: 'salon-abc', role: 'OWNER' }),
      ).toBe(true);
    });

    it('should reject modification on deleted assets', () => {
      const entity = createBaseEntity(FileStatus.READY);
      entity.softDelete();

      expect(entity.canModify({ userId: 'user-xyz' })).toBe(false);
      expect(() => entity.updateMetadata({ altText: 'New text' })).toThrow(
        BadRequestException,
      );
      expect(() => entity.changeVisibility(FileVisibility.PUBLIC)).toThrow(
        BadRequestException,
      );
    });
  });
});
