import { UserRole } from '@prisma/client';
import { Readable } from 'stream';
import { MediaAccessController } from '../controllers/media-access.controller';
import { FileAccessService } from '../services/file-access.service';

describe('MediaAccessController', () => {
  let controller: MediaAccessController;
  let fileAccessService: jest.Mocked<FileAccessService>;

  const mockUser = {
    sub: 'user-123',
    salonId: 'salon-456',
    role: UserRole.SALON_OWNER,
  };

  beforeEach(() => {
    fileAccessService = {
      getDownloadUrl: jest.fn(),
      getPublicUrl: jest.fn(),
      downloadStream: jest.fn(),
    } as any;

    controller = new MediaAccessController(fileAccessService);
  });

  describe('getDownloadUrl', () => {
    it('should generate signed download URL with extracted actor context and query options', async () => {
      const mockResult = {
        fileAssetId: 'asset-1',
        url: 'https://storage.example.com/asset-1?signed=true',
        isPublic: false,
        expiresInSeconds: 3600,
        expiresAt: new Date(),
        action: 'DOWNLOAD' as const,
      };

      fileAccessService.getDownloadUrl.mockResolvedValue(mockResult as any);

      const response = await controller.getDownloadUrl(
        'asset-1',
        { expiresInSeconds: 3600, filename: 'custom.pdf' },
        mockUser,
      );

      expect(fileAccessService.getDownloadUrl).toHaveBeenCalledWith(
        'asset-1',
        {
          userId: 'user-123',
          salonId: 'salon-456',
          role: UserRole.SALON_OWNER,
        },
        {
          expiresInSeconds: 3600,
          filename: 'custom.pdf',
          contentType: undefined,
        },
      );

      expect(response).toEqual(
        expect.objectContaining({
          success: true,
          data: mockResult,
        }),
      );
    });
  });

  describe('getPublicUrl', () => {
    it('should retrieve public CDN URL without requiring auth', async () => {
      const publicUrl = 'https://cdn.example.com/assets/public-image.jpg';
      fileAccessService.getPublicUrl.mockResolvedValue(publicUrl);

      const response = await controller.getPublicUrl('asset-public-1');

      expect(fileAccessService.getPublicUrl).toHaveBeenCalledWith('asset-public-1');
      expect(response).toEqual(
        expect.objectContaining({
          success: true,
          data: { url: publicUrl },
        }),
      );
    });
  });

  describe('streamDownload', () => {
    it('should set response headers and pipe readable stream to client', async () => {
      const readableStream = new Readable({
        read() {
          this.push(Buffer.from('binary-file-content'));
          this.push(null);
        },
      });

      fileAccessService.downloadStream.mockResolvedValue({
        stream: readableStream,
        contentType: 'image/png',
        contentLength: 1024,
        originalFileName: 'profile avatar.png',
      });

      const mockRes: any = {
        setHeader: jest.fn(),
      };
      readableStream.pipe = jest.fn();

      await controller.streamDownload('asset-1', mockUser, mockRes);

      expect(fileAccessService.downloadStream).toHaveBeenCalledWith(
        'asset-1',
        {
          userId: 'user-123',
          salonId: 'salon-456',
          role: UserRole.SALON_OWNER,
        },
      );

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Length', '1024');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="profile%20avatar.png"',
      );
      expect(readableStream.pipe).toHaveBeenCalledWith(mockRes);
    });
  });
});
