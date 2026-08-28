import {
  Body,
  Controller,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ResponseBuilder } from '../../../common/response/response-builder';
import { FileAssetActorContext } from '../entities/file-asset.entity';
import { FileLifecycleService } from '../services/file-lifecycle.service';
import {
  MarkFailedRequestDto,
  MarkReadyRequestDto,
} from '../dto/media-request.dto';

/**
 * MediaLifecycleController — REST API endpoints for controlling file lifecycle transitions:
 * finalize presigned uploads, restore soft-deleted files, mark as processing, ready, or failed.
 */
@ApiTags('Media - Lifecycle')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaLifecycleController {
  constructor(private readonly fileLifecycleService: FileLifecycleService) {}

  /**
   * Helper to extract strongly-typed FileAssetActorContext from request context.
   */
  private extractActorContext(user: any): FileAssetActorContext {
    return {
      userId: user?.sub ?? user?.id ?? user?.userId ?? '',
      salonId: user?.salonId ?? null,
      role: user?.role,
    };
  }

  /**
   * POST /media/:id/finalize
   * Finalizes a presigned upload, verifying storage existence and transitioning status from PENDING to READY.
   */
  @Post(':id/finalize')
  @ApiOperation({
    summary: 'Finalize presigned upload',
    description:
      'Verifies the file was uploaded to storage and transitions the status from PENDING to READY.',
  })
  @ApiParam({
    name: 'id',
    description: 'File Asset UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File asset finalized and marked READY',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'File asset not found or unauthorized (IDOR-safe)',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'File not yet uploaded to storage or invalid state transition',
  })
  public async finalizeUpload(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const actor = this.extractActorContext(user);
    const result = await this.fileLifecycleService.finalizeUpload(id, actor);
    return ResponseBuilder.success(result);
  }

  /**
   * POST /media/:id/restore
   * Restores a soft-deleted file asset back to ACTIVE/READY status.
   */
  @Post(':id/restore')
  @ApiOperation({
    summary: 'Restore a soft-deleted file asset',
    description:
      'Restores a soft-deleted file asset back to READY status and clears the deletedAt timestamp.',
  })
  @ApiParam({
    name: 'id',
    description: 'File Asset UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File asset restored successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'File asset not found or unauthorized (IDOR-safe)',
  })
  public async restoreFileAsset(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const actor = this.extractActorContext(user);
    const result = await this.fileLifecycleService.restore(id, actor);
    return ResponseBuilder.success(result);
  }

  /**
   * POST /media/:id/processing
   * Transitions file asset status to PROCESSING (e.g. for background media transcoding/processing).
   */
  @Post(':id/processing')
  @ApiOperation({
    summary: 'Mark file asset as PROCESSING',
    description:
      'Used by processing workers or upload hooks when a media asset is undergoing asynchronous transformation.',
  })
  @ApiParam({
    name: 'id',
    description: 'File Asset UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File marked as PROCESSING',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'File asset not found or unauthorized (IDOR-safe)',
  })
  public async markAsProcessing(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const actor = this.extractActorContext(user);
    const result = await this.fileLifecycleService.startProcessing(id, actor);
    return ResponseBuilder.success(result);
  }

  /**
   * POST /media/:id/ready
   * Transitions file asset status to READY with optional size and checksum validation.
   */
  @Post(':id/ready')
  @ApiOperation({
    summary: 'Mark file asset as READY',
    description:
      'Marks a file as READY and optionally updates the confirmed size, mimeType, and SHA-256 checksum.',
  })
  @ApiParam({
    name: 'id',
    description: 'File Asset UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File marked as READY',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'File asset not found or unauthorized (IDOR-safe)',
  })
  public async markAsReady(
    @Param('id') id: string,
    @Body() dto: MarkReadyRequestDto,
    @CurrentUser() user: any,
  ) {
    const actor = this.extractActorContext(user);
    const result = await this.fileLifecycleService.markReady(
      id,
      dto as any,
      actor,
    );
    return ResponseBuilder.success(result);
  }

  /**
   * POST /media/:id/failed
   * Transitions file asset status to FAILED with failure reason recorded.
   */
  @Post(':id/failed')
  @ApiOperation({
    summary: 'Mark file asset as FAILED',
    description:
      'Marks a file upload/processing as FAILED and records the failure reason.',
  })
  @ApiParam({
    name: 'id',
    description: 'File Asset UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File marked as FAILED',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'File asset not found or unauthorized (IDOR-safe)',
  })
  public async markAsFailed(
    @Param('id') id: string,
    @Body() dto: MarkFailedRequestDto,
    @CurrentUser() user: any,
  ) {
    const actor = this.extractActorContext(user);
    const result = await this.fileLifecycleService.markFailed(
      id,
      dto?.reason || 'File upload/processing failed',
      actor,
    );
    return ResponseBuilder.success(result);
  }
}
