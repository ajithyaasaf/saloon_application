import { UserRole } from '@prisma/client';
import { MediaLifecycleController } from '../controllers/media-lifecycle.controller';
import { FileLifecycleService } from '../services/file-lifecycle.service';

describe('MediaLifecycleController', () => {
  let controller: MediaLifecycleController;
  let fileLifecycleService: jest.Mocked<FileLifecycleService>;

  const mockUser = {
    sub: 'user-123',
    salonId: 'salon-456',
    role: UserRole.SALON_OWNER,
  };

  beforeEach(() => {
    fileLifecycleService = {
      finalizeUpload: jest.fn(),
      restore: jest.fn(),
      startProcessing: jest.fn(),
      markReady: jest.fn(),
      markFailed: jest.fn(),
    } as any;

    controller = new MediaLifecycleController(fileLifecycleService);
  });

  describe('finalizeUpload', () => {
    it('should finalize presigned upload and return finalized asset', async () => {
      const mockAsset = { id: 'asset-1', status: 'READY' };
      fileLifecycleService.finalizeUpload.mockResolvedValue(mockAsset as any);

      const response = await controller.finalizeUpload('asset-1', mockUser);

      expect(fileLifecycleService.finalizeUpload).toHaveBeenCalledWith(
        'asset-1',
        {
          userId: 'user-123',
          salonId: 'salon-456',
          role: UserRole.SALON_OWNER,
        },
      );

      expect(response).toEqual(
        expect.objectContaining({
          success: true,
          data: mockAsset,
        }),
      );
    });
  });

  describe('restoreFileAsset', () => {
    it('should restore a soft-deleted file asset', async () => {
      const mockAsset = { id: 'asset-1', status: 'READY', deletedAt: null };
      fileLifecycleService.restore.mockResolvedValue(mockAsset as any);

      const response = await controller.restoreFileAsset('asset-1', mockUser);

      expect(fileLifecycleService.restore).toHaveBeenCalledWith('asset-1', {
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

  describe('markAsProcessing', () => {
    it('should mark asset as PROCESSING', async () => {
      const mockAsset = { id: 'asset-1', status: 'PROCESSING' };
      fileLifecycleService.startProcessing.mockResolvedValue(mockAsset as any);

      const response = await controller.markAsProcessing('asset-1', mockUser);

      expect(fileLifecycleService.startProcessing).toHaveBeenCalledWith('asset-1', {
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

  describe('markAsReady', () => {
    it('should mark asset as READY with metadata updates', async () => {
      const dto = { sizeBytes: 2048, checksum: 'sha-256-hash' };
      const mockAsset = { id: 'asset-1', status: 'READY', ...dto };
      fileLifecycleService.markReady.mockResolvedValue(mockAsset as any);

      const response = await controller.markAsReady('asset-1', dto, mockUser);

      expect(fileLifecycleService.markReady).toHaveBeenCalledWith(
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
          data: mockAsset,
        }),
      );
    });
  });

  describe('markAsFailed', () => {
    it('should mark asset as FAILED with failure reason', async () => {
      const dto = { reason: 'Transcoding error' };
      const mockAsset = { id: 'asset-1', status: 'FAILED' };
      fileLifecycleService.markFailed.mockResolvedValue(mockAsset as any);

      const response = await controller.markAsFailed('asset-1', dto, mockUser);

      expect(fileLifecycleService.markFailed).toHaveBeenCalledWith(
        'asset-1',
        'Transcoding error',
        {
          userId: 'user-123',
          salonId: 'salon-456',
          role: UserRole.SALON_OWNER,
        },
      );

      expect(response).toEqual(
        expect.objectContaining({
          success: true,
          data: mockAsset,
        }),
      );
    });
  });
});
