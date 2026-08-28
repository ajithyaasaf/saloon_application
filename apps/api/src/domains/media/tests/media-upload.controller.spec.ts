import { BadRequestException } from '@nestjs/common';
import { FileCategory, FileVisibility, UserRole } from '@prisma/client';
import { MediaUploadController } from '../controllers/media-upload.controller';
import { FileUploadService } from '../services/file-upload.service';

describe('MediaUploadController', () => {
  let controller: MediaUploadController;
  let fileUploadService: jest.Mocked<FileUploadService>;

  const mockUser = {
    sub: 'user-123',
    salonId: 'salon-456',
    role: UserRole.SALON_OWNER,
  };

  beforeEach(() => {
    fileUploadService = {
      initiatePresignedUpload: jest.fn(),
      uploadDirect: jest.fn(),
    } as any;

    controller = new MediaUploadController(fileUploadService);
  });

  describe('initiatePresignedUpload', () => {
    it('should extract actor context and delegate presigned upload initiation', async () => {
      const dto = {
        originalFileName: 'avatar.png',
        mimeType: 'image/png',
        sizeBytes: 1024,
        category: FileCategory.STAFF,
        visibility: FileVisibility.PUBLIC,
      };

      const mockResult = {
        fileAsset: { id: 'asset-1', originalFileName: 'avatar.png' },
        uploadUrl: 'https://storage.example.com/upload?signed=true',
        objectKey: 'tenant/salon-456/staff/asset-1.png',
        expiresAt: new Date(),
        action: 'UPLOAD',
      };

      fileUploadService.initiatePresignedUpload.mockResolvedValue(mockResult as any);

      const response = await controller.initiatePresignedUpload(mockUser, dto);

      expect(fileUploadService.initiatePresignedUpload).toHaveBeenCalledWith(
        expect.objectContaining({
          originalFileName: 'avatar.png',
          mimeType: 'image/png',
          sizeBytes: 1024,
          category: FileCategory.STAFF,
          visibility: FileVisibility.PUBLIC,
          salonId: 'salon-456',
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
          data: mockResult,
        }),
      );
    });

    it('should allow overriding salonId if provided in DTO', async () => {
      const dto = {
        originalFileName: 'service.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 2048,
        salonId: 'custom-salon-789',
      };

      fileUploadService.initiatePresignedUpload.mockResolvedValue({} as any);

      await controller.initiatePresignedUpload(mockUser, dto);

      expect(fileUploadService.initiatePresignedUpload).toHaveBeenCalledWith(
        expect.objectContaining({
          salonId: 'custom-salon-789',
        }),
        expect.any(Object),
      );
    });
  });

  describe('directUpload', () => {
    it('should throw BadRequestException if file or buffer is missing', async () => {
      await expect(
        controller.directUpload(mockUser, null as any, {}),
      ).rejects.toThrow(BadRequestException);

      await expect(
        controller.directUpload(mockUser, { buffer: null } as any, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should delegate direct multipart buffer upload and return 201 response', async () => {
      const mockMulterFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'document.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 5120,
        buffer: Buffer.from('pdf-content'),
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      const dto = {
        category: FileCategory.DOCUMENT,
        visibility: FileVisibility.TENANT,
      };

      const mockAsset = {
        id: 'asset-pdf-1',
        originalFileName: 'document.pdf',
        sizeBytes: 5120,
        status: 'READY',
      };

      fileUploadService.uploadDirect.mockResolvedValue(mockAsset as any);

      const response = await controller.directUpload(
        mockUser,
        mockMulterFile,
        dto,
      );

      expect(fileUploadService.uploadDirect).toHaveBeenCalledWith(
        expect.objectContaining({
          originalFileName: 'document.pdf',
          buffer: mockMulterFile.buffer,
          mimeType: 'application/pdf',
          sizeBytes: 5120,
          category: FileCategory.DOCUMENT,
          visibility: FileVisibility.TENANT,
          salonId: 'salon-456',
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
          data: mockAsset,
        }),
      );
    });
  });
});
