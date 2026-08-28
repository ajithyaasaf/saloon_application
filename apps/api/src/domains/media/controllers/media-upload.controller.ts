import {
  BadRequestException,
  Body,
  Controller,
  HttpStatus,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ResponseBuilder } from '../../../common/response/response-builder';
import { FileAssetActorContext } from '../entities/file-asset.entity';
import { FileUploadService } from '../services/file-upload.service';
import {
  DirectUploadRequestDto,
  InitiatePresignedUploadRequestDto,
} from '../dto/media-request.dto';

/**
 * MediaUploadController — REST API endpoints for initiating presigned uploads
 * and performing direct multipart file uploads.
 *
 * Security:
 * - Requires valid JWT authentication (JwtAuthGuard).
 * - Enforces actor context extraction for strict tenant/user attribution.
 * - Never trusts client-supplied uploadedByUserId or caller role.
 */
@ApiTags('Media - Upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media/upload')
export class MediaUploadController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  /**
   * Helper to extract strongly-typed FileAssetActorContext from authenticated request user.
   */
  private extractActorContext(user: any): FileAssetActorContext {
    return {
      userId: user?.sub ?? user?.id ?? user?.userId ?? '',
      salonId: user?.salonId ?? null,
      role: user?.role,
    };
  }

  /**
   * POST /media/upload/presigned
   * Initiates a presigned direct-to-storage upload URL and persists a PENDING FileAsset record.
   */
  @Post('presigned')
  @ApiOperation({
    summary: 'Initiate a presigned direct upload URL and create a PENDING file asset',
    description:
      'Generates a time-limited signed upload URL (PUT) for direct client-to-storage upload. Creates a database record in PENDING status.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Presigned upload URL generated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input, unsupported mime-type, or file size exceeds limit',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  public async initiatePresignedUpload(
    @CurrentUser() user: any,
    @Body() dto: InitiatePresignedUploadRequestDto,
  ) {
    const actor = this.extractActorContext(user);
    const result = await this.fileUploadService.initiatePresignedUpload(
      {
        originalFileName: dto.originalFileName,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        category: dto.category,
        visibility: dto.visibility,
        folder: dto.folder,
        altText: dto.altText,
        checksum: dto.checksum,
        expiresInSeconds: dto.expiresInSeconds,
        salonId: dto.salonId ?? actor.salonId ?? undefined,
        metadata: dto.metadata,
      } as any,
      actor,
    );

    return ResponseBuilder.created(result);
  }

  /**
   * POST /media/upload/direct
   * Uploads a file directly to the API via multipart/form-data.
   * Performs in-memory buffer upload to the underlying storage provider and marks asset as READY.
   */
  @Post('direct')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload file directly via multipart/form-data',
    description:
      'Uploads a file buffer directly through the API to storage and marks the record READY immediately.',
  })
  @ApiBody({
    description: 'Direct file upload multipart payload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'The binary file to upload',
        },
        category: {
          type: 'string',
          description: 'File functional category',
          example: 'SALON_GALLERY',
        },
        visibility: {
          type: 'string',
          description: 'File visibility level',
          example: 'PUBLIC',
        },
        salonId: {
          type: 'string',
          description: 'Optional target salon ID (for multi-tenant association)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'File uploaded and stored successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Missing file buffer or validation failure',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  public async directUpload(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: DirectUploadRequestDto,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('File is required for direct upload');
    }

    const actor = this.extractActorContext(user);
    const result = await this.fileUploadService.uploadDirect(
      {
        originalFileName: file.originalname || 'uploaded-file',
        buffer: file.buffer,
        mimeType: file.mimetype || 'application/octet-stream',
        sizeBytes: file.size ?? file.buffer.length,
        category: dto.category,
        visibility: dto.visibility,
        folder: dto.folder,
        altText: dto.altText,
        width: dto.width,
        height: dto.height,
        duration: dto.duration,
        checksum: dto.checksum,
        salonId: dto.salonId ?? actor.salonId ?? undefined,
        metadata: dto.metadata,
      } as any,
      actor,
    );

    return ResponseBuilder.created(result);
  }
}
