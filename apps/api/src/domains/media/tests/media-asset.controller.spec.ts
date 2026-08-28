import { FileCategory, FileVisibility, UserRole } from '@prisma/client';
import { MediaAssetController } from '../controllers/media-asset.controller';
import { FileAssetService } from '../services/file-asset.service';

describe('MediaAssetController', () => {
  let controller: MediaAssetController;
  let fileAssetService: jest.Mocked<FileAssetService>;

  const mockUser = {
    sub: 'user-123',
    salonId: 'salon-456',
    role: UserRole.SALON_OWNER,
  };

  beforeEach(() => {
    fileAssetService = {
      findById: jest.fn(),
      search: jest.fn(),
      update: jest.fn(),
      changeVisibility: jest.fn(),
      changeCategory: jest.fn(),
      delete: jest.fn(),
    } as any;

    controller = new MediaAssetController(fileAssetService);
  });

  describe('searchFileAssets', () => {
    it('should search file assets and return paginated envelope', async () => {
      const mockAssets = [
        { id: 'asset-1', originalFileName: 'photo1.jpg' },
        { id: 'asset-2', originalFileName: 'photo2.jpg' },
      ];

      fileAssetService.search.mockResolvedValue({
        data: mockAssets as any,
        total: 2,
      });

      const response = await controller.searchFileAssets(mockUser, {
        page: 1,
        limit: 10,
        category: FileCategory.GALLERY,
      });

      expect(fileAssetService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 10,
          category: FileCategory.GALLERY,
        }),
        {
          userId: 'user-123',
          salonId: 'salon-456',
          role: UserRole.SALON_OWNER,
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
              limit: 10,
              totalPages: 1,
            }),
          }),
        }),
      );
    });
  });

  describe('getFileAssetById', () => {
    it('should get asset by ID for authorized actor', async () => {
      const mockAsset = { id: 'asset-1', originalFileName: 'photo1.jpg' };
      fileAssetService.findById.mockResolvedValue(mockAsset as any);

      const response = await controller.getFileAssetById('asset-1', mockUser);

      expect(fileAssetService.findById).toHaveBeenCalledWith('asset-1', {
        userId: 'user-123',
        salonId: 'salon-456',
        role: UserRole.SALON_OWNER,
      });

      expect(response).toEqual(
        expect.objectContaining({
          success: true,
          data: mockAsset,
        }),
      );
    });
  });

  describe('updateFileAsset', () => {
    it('should update file asset metadata', async () => {
      const dto = {
        originalFileName: 'new-name.jpg',
        altText: 'New Alt',
        metadata: { updated: true },
      };
      const updatedAsset = { id: 'asset-1', ...dto };
      fileAssetService.update.mockResolvedValue(updatedAsset as any);

      const response = await controller.updateFileAsset('asset-1', dto, mockUser);

      expect(fileAssetService.update).toHaveBeenCalledWith(
        'asset-1',
        dto,
        {
          userId: 'user-123',
          salonId: 'salon-456',
          role: UserRole.SALON_OWNER,
        },
      );

      expect(response).toEqual(
        expect.objectContaining({
          success: true,
          data: updatedAsset,
        }),
      );
    });
  });

  describe('updateVisibility', () => {
    it('should update asset visibility', async () => {
      const updatedAsset = { id: 'asset-1', visibility: FileVisibility.PUBLIC };
      fileAssetService.changeVisibility.mockResolvedValue(updatedAsset as any);

      const response = await controller.updateVisibility(
        'asset-1',
        { visibility: FileVisibility.PUBLIC },
        mockUser,
      );

      expect(fileAssetService.changeVisibility).toHaveBeenCalledWith(
        'asset-1',
        FileVisibility.PUBLIC,
        {
          userId: 'user-123',
          salonId: 'salon-456',
          role: UserRole.SALON_OWNER,
        },
      );

      expect(response).toEqual(
        expect.objectContaining({
          success: true,
          data: updatedAsset,
        }),
      );
    });
  });

  describe('updateCategory', () => {
    it('should update asset category', async () => {
      const updatedAsset = { id: 'asset-1', category: FileCategory.SERVICE };
      fileAssetService.changeCategory.mockResolvedValue(updatedAsset as any);

      const response = await controller.updateCategory(
        'asset-1',
        { category: FileCategory.SERVICE },
        mockUser,
      );

      expect(fileAssetService.changeCategory).toHaveBeenCalledWith(
        'asset-1',
        FileCategory.SERVICE,
        {
          userId: 'user-123',
          salonId: 'salon-456',
          role: UserRole.SALON_OWNER,
        },
      );

      expect(response).toEqual(
        expect.objectContaining({
          success: true,
          data: updatedAsset,
        }),
      );
    });
  });

  describe('deleteFileAsset', () => {
    it('should soft delete file asset', async () => {
      const deletedAsset = { id: 'asset-1', status: 'DELETED' };
      fileAssetService.delete.mockResolvedValue(deletedAsset as any);

      const response = await controller.deleteFileAsset('asset-1', mockUser);

      expect(fileAssetService.delete).toHaveBeenCalledWith('asset-1', {
        userId: 'user-123',
        salonId: 'salon-456',
        role: UserRole.SALON_OWNER,
      });

      expect(response).toEqual(
        expect.objectContaining({
          success: true,
          data: deletedAsset,
        }),
      );
    });
  });
});
