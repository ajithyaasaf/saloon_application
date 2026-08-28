import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
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
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ResponseBuilder } from '../../../common/response/response-builder';
import { PaginationUtil } from '../../../common/utils/pagination.util';
import { FileAssetActorContext } from '../entities/file-asset.entity';
import { FileAssetService } from '../services/file-asset.service';
import {
  SearchFileAssetsQueryRequestDto,
  UpdateCategoryDto,
  UpdateFileAssetRequestDto,
  UpdateVisibilityDto,
} from '../dto/media-request.dto';

/**
 * MediaAssetController — REST API endpoints for searching, retrieving,
 * modifying metadata, changing visibility/category, and soft-deleting file assets.
 */
@ApiTags('Media - Assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaAssetController {
  constructor(private readonly fileAssetService: FileAssetService) {}

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
   * GET /media
   * Search and list file assets with pagination, tenant scoping, and filters.
   */
  @Get()
  @ApiOperation({
    summary: 'Search and list file assets',
    description:
      'Returns a paginated list of file assets filtered by salon, category, status, visibility, or mime-type with strict tenant isolation.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated file assets retrieved successfully',
  })
  public async searchFileAssets(
    @CurrentUser() user: any,
    @Query() query: SearchFileAssetsQueryRequestDto,
  ) {
    const actor = this.extractActorContext(user);
    const result = await this.fileAssetService.search(query as any, actor);

    const paginationMeta = PaginationUtil.buildMeta(result.total, {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });

    return ResponseBuilder.paginated(result.data, paginationMeta);
  }

  /**
   * GET /media/:id
   * Get sanitized file asset metadata by ID.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get file asset metadata by ID',
    description:
      'Retrieves sanitized file metadata for an authorized asset. Ensures IDOR protection (returns 404 for unauthorized assets).',
  })
  @ApiParam({
    name: 'id',
    description: 'File Asset UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File asset metadata retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Asset not found or unauthorized (IDOR-safe)',
  })
  public async getFileAssetById(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const actor = this.extractActorContext(user);
    const result = await this.fileAssetService.findById(id, actor);
    return ResponseBuilder.success(result);
  }

  /**
   * PATCH /media/:id
   * Update file asset metadata (description, tags, custom metadata).
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update file asset metadata',
    description:
      'Updates mutable metadata fields (description, tags, metadata JSON) on an authorized file asset.',
  })
  @ApiParam({
    name: 'id',
    description: 'File Asset UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File asset metadata updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Asset not found or unauthorized (IDOR-safe)',
  })
  public async updateFileAsset(
    @Param('id') id: string,
    @Body() dto: UpdateFileAssetRequestDto,
    @CurrentUser() user: any,
  ) {
    const actor = this.extractActorContext(user);
    const result = await this.fileAssetService.update(id, dto as any, actor);
    return ResponseBuilder.success(result);
  }

  /**
   * PATCH /media/:id/visibility
   * Update file asset access visibility level.
   */
  @Patch(':id/visibility')
  @ApiOperation({
    summary: 'Update file asset visibility level',
    description:
      'Changes access visibility (e.g. PRIVATE, TENANT_ONLY, AUTHENTICATED, PUBLIC) with strict ownership/admin verification.',
  })
  @ApiParam({
    name: 'id',
    description: 'File Asset UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File visibility updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Asset not found or unauthorized (IDOR-safe)',
  })
  public async updateVisibility(
    @Param('id') id: string,
    @Body() dto: UpdateVisibilityDto,
    @CurrentUser() user: any,
  ) {
    const actor = this.extractActorContext(user);
    const result = await this.fileAssetService.changeVisibility(
      id,
      dto.visibility,
      actor,
    );
    return ResponseBuilder.success(result);
  }

  /**
   * PATCH /media/:id/category
   * Update file asset functional category.
   */
  @Patch(':id/category')
  @ApiOperation({
    summary: 'Update file asset category',
    description:
      'Updates the functional category tag for the file asset.',
  })
  @ApiParam({
    name: 'id',
    description: 'File Asset UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File category updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Asset not found or unauthorized (IDOR-safe)',
  })
  public async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: any,
  ) {
    const actor = this.extractActorContext(user);
    const result = await this.fileAssetService.changeCategory(
      id,
      dto.category,
      actor,
    );
    return ResponseBuilder.success(result);
  }

  /**
   * DELETE /media/:id
   * Soft deletes a file asset (marks status as DELETED and sets deletedAt timestamp).
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Soft delete a file asset',
    description:
      'Marks the file asset as DELETED, making it inaccessible to standard queries while preserving storage for audit/retention.',
  })
  @ApiParam({
    name: 'id',
    description: 'File Asset UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File asset soft-deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Asset not found or unauthorized (IDOR-safe)',
  })
  public async deleteFileAsset(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const actor = this.extractActorContext(user);
    const result = await this.fileAssetService.delete(id, actor);
    return ResponseBuilder.success(result);
  }
}
