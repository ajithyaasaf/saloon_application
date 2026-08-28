import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ResponseBuilder } from '../../../common/response/response-builder';
import { FileAssetActorContext } from '../entities/file-asset.entity';
import { FileAccessService } from '../services/file-access.service';
import { DownloadUrlQueryDto } from '../dto/media-request.dto';

/**
 * MediaAccessController — REST API endpoints for secure media access,
 * signed download URL generation, direct streaming download, and public URL retrieval.
 */
@ApiTags('Media - Access & Delivery')
@Controller('media')
export class MediaAccessController {
  constructor(private readonly fileAccessService: FileAccessService) {}

  /**
   * Helper to extract strongly-typed FileAssetActorContext from request context.
   */
  private extractActorContext(user?: any): FileAssetActorContext {
    return {
      userId: user?.sub ?? user?.id ?? user?.userId ?? '',
      salonId: user?.salonId ?? null,
      role: user?.role,
    };
  }

  /**
   * GET /media/:id/download-url
   * Generates a time-limited cryptographically signed URL for file download.
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id/download-url')
  @ApiOperation({
    summary: 'Generate a signed download URL for an authorized file asset',
    description:
      'Creates a cryptographically signed, expiring GET URL with Content-Disposition headers for direct download from storage.',
  })
  @ApiParam({
    name: 'id',
    description: 'File Asset UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Signed download URL generated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'File asset not found or unauthorized (IDOR-safe)',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid TTL or asset not in READY status',
  })
  public async getDownloadUrl(
    @Param('id') id: string,
    @Query() query: DownloadUrlQueryDto,
    @CurrentUser() user: any,
  ) {
    const actor = this.extractActorContext(user);
    const result = await this.fileAccessService.getDownloadUrl(
      id,
      actor,
      {
        expiresInSeconds: query?.expiresInSeconds
          ? Number(query.expiresInSeconds)
          : undefined,
        filename: query?.filename,
        contentType: query?.contentType,
      },
    );

    return ResponseBuilder.success(result);
  }

  /**
   * GET /media/:id/public-url
   * Retrieves the direct public CDN URL for assets with PUBLIC visibility.
   */
  @Public()
  @Get(':id/public-url')
  @ApiOperation({
    summary: 'Get public CDN URL for a publicly accessible file asset',
    description:
      'Returns the public URL if the asset is in READY status and has PUBLIC visibility. Does not require authentication for public assets.',
  })
  @ApiParam({
    name: 'id',
    description: 'File Asset UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Public URL retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Asset not found or not publicly accessible',
  })
  public async getPublicUrl(
    @Param('id') id: string,
  ) {
    const result = await this.fileAccessService.getPublicUrl(id);
    return ResponseBuilder.success({ url: result });
  }

  /**
   * GET /media/:id/download
   * Streams the binary file content directly to the client with appropriate headers.
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id/download')
  @ApiOperation({
    summary: 'Stream binary file content directly from storage to the client',
    description:
      'Streams the file content with appropriate Content-Type, Content-Length, and Content-Disposition headers.',
  })
  @ApiParam({
    name: 'id',
    description: 'File Asset UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Binary media stream',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Asset not found or unauthorized (IDOR-safe)',
  })
  public async streamDownload(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const actor = this.extractActorContext(user);
    const streamOutput = await this.fileAccessService.downloadStream(
      id,
      actor,
    );

    res.setHeader(
      'Content-Type',
      streamOutput.contentType || 'application/octet-stream',
    );
    if (streamOutput.contentLength) {
      res.setHeader('Content-Length', streamOutput.contentLength.toString());
    }
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(streamOutput.originalFileName)}"`,
    );

    (streamOutput.stream as any).pipe(res);
  }
}
