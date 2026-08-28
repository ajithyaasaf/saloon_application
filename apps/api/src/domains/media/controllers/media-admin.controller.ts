import {
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ResponseBuilder } from '../../../common/response/response-builder';
import { PaginationUtil } from '../../../common/utils/pagination.util';
import { FileAssetActorContext } from '../entities/file-asset.entity';
import { FileAssetService } from '../services/file-asset.service';
import { FileLifecycleService } from '../services/file-lifecycle.service';
import { SearchFileAssetsQueryRequestDto } from '../dto/media-request.dto';

/**
 * MediaAdminController — Administrative REST API endpoints for global cross-tenant media management,
 * comprehensive metadata inspection, deletion, and restoration.
 *
 * Security:
 * - Requires valid JWT authentication.
 * - Restricted to SUPER_ADMIN and SUPPORT_AGENT roles.
 */
@ApiTags('Admin - Media Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.SUPPORT_AGENT)
@Controller('admin/media')
export class MediaAdminController {
  constructor(
    private readonly fileAssetService: FileAssetService,
    private readonly fileLifecycleService: FileLifecycleService,
  ) {}

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
   * GET /admin/media
   * Global cross-tenant file asset search with support for viewing soft-deleted records.
   */
  @Get()
  @ApiOperation({
    summary: 'Admin search file assets across all tenants',
    description:
      'Provides global search across all salons, including soft-deleted files, with pagination and filtering.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated admin search results retrieved successfully',
  })
  public async searchAdminMedia(
    @CurrentUser() user: any,
    @Query() query: SearchFileAssetsQueryRequestDto,
  ) {
    const actor = this.extractActorContext(user);
    const result = await this.fileAssetService.search(
      {
        ...query,
        includeDeleted:
          query.includeDeleted !== undefined
            ? Boolean(query.includeDeleted)
            : true,
      } as any,
      actor,
    );

    const paginationMeta = PaginationUtil.buildMeta(result.total, {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });

    return ResponseBuilder.paginated(result.data, paginationMeta);
  }

  /**
   * GET /admin/media/:id
   * Complete inspection of a file asset including internal storage details (bucket, provider, objectKey).
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Admin inspect complete file metadata',
    description:
      'Retrieves metadata including storage bucket, provider, objectKey, and security hashes for auditing.',
  })
  @ApiParam({
    name: 'id',
    description: 'File Asset UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Complete file metadata retrieved',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'File asset not found',
  })
  public async inspectFileAsset(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const actor = this.extractActorContext(user);
    const result = await this.fileAssetService.findById(id, actor);
    return ResponseBuilder.success(result);
  }

  /**
   * DELETE /admin/media/:id
   * Admin deletion: performs soft deletion of file asset.
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Admin delete file asset',
    description:
      'Soft deletes the asset, marking status as DELETED and setting deletedAt timestamp.',
  })
  @ApiParam({
    name: 'id',
    description: 'File Asset UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File asset deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'File asset not found',
  })
  public async deleteMedia(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const actor = this.extractActorContext(user);
    const result = await this.fileAssetService.delete(id, actor);
    return ResponseBuilder.success(result);
  }

  /**
   * POST /admin/media/:id/restore
   * Admin restores a soft-deleted file asset.
   */
  @Post(':id/restore')
  @ApiOperation({
    summary: 'Admin restore soft-deleted file asset',
    description:
      'Restores a soft-deleted file asset across any tenant back to READY status.',
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
    description: 'File asset not found',
  })
  public async restoreMedia(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const actor = this.extractActorContext(user);
    const result = await this.fileLifecycleService.restore(id, actor);
    return ResponseBuilder.success(result);
  }
}
