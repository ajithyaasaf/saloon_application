import { UserRole } from '@prisma/client';
import { MediaAdminController } from '../controllers/media-admin.controller';
import { FileAssetService } from '../services/file-asset.service';
import { FileLifecycleService } from '../services/file-lifecycle.service';

describe('MediaAdminController', () => {
  let controller: MediaAdminController;
  let fileAssetService: jest.Mocked<FileAssetService>;
  let fileLifecycleService: jest.Mocked<FileLifecycleService>;

  const mockAdminUser = {
    sub: 'admin-1',
    salonId: null,
    role: UserRole.SUPER_ADMIN,
  };

  beforeEach(() => {
    fileAssetService = {
      search: jest.fn(),
      findById: jest.fn(),
      delete: jest.fn(),
    } as any;

    fileLifecycleService = {
      restore: jest.fn(),
    } as any;

    controller = new MediaAdminController(
      fileAssetService,
      fileLifecycleService,
    );
  });

  describe('searchAdminMedia', () => {
    it('should perform global cross-tenant search including deleted files', async () => {
      const mockAssets = [
        { id: 'asset-1', originalFileName: 'file1.jpg' },
        { id: 'asset-2', originalFileName: 'file2.jpg', deletedAt: new Date() },
      ];

      fileAssetService.search.mockResolvedValue({
        data: mockAssets as any,
        total: 2,
      });

      const response = await controller.searchAdminMedia(mockAdminUser, {
        page: 1,
        limit: 20,
      });

      expect(fileAssetService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          includeDeleted: true,
          page: 1,
          limit: 20,
        }),
        {
          userId: 'admin-1',
          salonId: null,
          role: UserRole.SUPER_ADMIN,
        },
      );

      expect(response).toEqual(
        expect.objectContaining({
          success: true,
          data: mockAssets,
          meta: expect.objectContaining({
            pagination: expect.objectContaining({
              total: 2,
              page: 1,
              limit: 20,
              totalPages: 1,
            }),
          }),
        }),
      );
    });
  });

  describe('inspectFileAsset', () => {
    it('should retrieve full file asset metadata for admin', async () => {
      const mockAsset = {
        id: 'asset-1',
        originalFileName: 'file1.jpg',
        bucket: 'saloon-assets',
        provider: 'CLOUDFLARE_R2',
        objectKey: 'salons/salon-1/documents/doc-1.pdf',
      };

      fileAssetService.findById.mockResolvedValue(mockAsset as any);

      const response = await controller.inspectFileAsset('asset-1', mockAdminUser);

      expect(fileAssetService.findById).toHaveBeenCalledWith('asset-1', {
        userId: 'admin-1',
        salonId: null,
        role: UserRole.SUPER_ADMIN,
      });

      expect(response).toEqual(
        expect.objectContaining({
          success: true,
          data: mockAsset,
        }),
      );
    });
  });

  describe('deleteMedia', () => {
    it('should delete file asset', async () => {
      const deletedAsset = { id: 'asset-1', status: 'DELETED' };
      fileAssetService.delete.mockResolvedValue(deletedAsset as any);

      const response = await controller.deleteMedia('asset-1', mockAdminUser);

      expect(fileAssetService.delete).toHaveBeenCalledWith('asset-1', {
        userId: 'admin-1',
        salonId: null,
        role: UserRole.SUPER_ADMIN,
      });

      expect(response).toEqual(
        expect.objectContaining({
          success: true,
          data: deletedAsset,
        }),
      );
    });
  });

  describe('restoreMedia', () => {
    it('should restore soft-deleted file asset as admin', async () => {
      const restoredAsset = { id: 'asset-1', status: 'READY', deletedAt: null };
      fileLifecycleService.restore.mockResolvedValue(restoredAsset as any);

      const response = await controller.restoreMedia('asset-1', mockAdminUser);

      expect(fileLifecycleService.restore).toHaveBeenCalledWith('asset-1', {
        userId: 'admin-1',
        salonId: null,
        role: UserRole.SUPER_ADMIN,
      });

      expect(response).toEqual(
        expect.objectContaining({
          success: true,
          data: restoredAsset,
        }),
      );
    });
  });
});
