import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { StockMovementType, UserRole } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ResponseBuilder } from '../../../common/response/response-builder';
import { PaginationUtil } from '../../../common/utils/pagination.util';

import {
  CreateProductDto,
  CreateProductVariantDto,
  ProductDto,
  ProductVariantDto,
  UpdateProductDto,
  UpdateProductVariantDto,
} from '../dto/product.dto';
import {
  CreateSupplierContactDto,
  CreateSupplierDto,
  SupplierContactDto,
  SupplierDto,
  UpdateSupplierContactDto,
  UpdateSupplierDto,
} from '../dto/supplier.dto';
import {
  CreateGoodsReceivedNoteDto,
  CreatePurchaseOrderDto,
  GoodsReceivedNoteDto,
  PurchaseOrderDto,
  UpdatePurchaseOrderDto,
} from '../dto/purchase-order.dto';
import { InventoryStockDto, LowStockAlertDto } from '../dto/inventory-stock.dto';
import { StockMovementDto } from '../dto/stock-movement.dto';
import { CreateStockTransferDto, StockTransferDto } from '../dto/stock-transfer.dto';
import { CreateStockAdjustmentDto, StockAdjustmentDto } from '../dto/stock-adjustment.dto';
import { CreateStockAuditDto, StockAuditDto } from '../dto/stock-audit.dto';
import { CreateProductUsageDto, ProductUsageDto } from '../dto/product-usage.dto';
import {
  SearchAuditQueryDto,
  SearchInventoryQueryDto,
  SearchMovementQueryDto,
  SearchProductQueryDto,
  SearchSupplierQueryDto,
  SearchTransferQueryDto,
} from '../dto/search-inventory.dto';

import { GoodsReceivedService } from '../services/goods-received.service';
import { InventoryService } from '../services/inventory.service';
import { LowStockAlertService } from '../services/low-stock-alert.service';
import { ProductUsageService } from '../services/product-usage.service';
import { ProductService } from '../services/product.service';
import { PurchaseOrderService } from '../services/purchase-order.service';
import { StockAdjustmentService } from '../services/stock-adjustment.service';
import { StockAuditService } from '../services/stock-audit.service';
import { StockMovementService } from '../services/stock-movement.service';
import { StockTransferService } from '../services/stock-transfer.service';
import { SupplierService } from '../services/supplier.service';

/**
 * InventoryOwnerController — B2B inventory, catalog, procurement, and stock management APIs for Salon Owners.
 *
 * Auth: Requires valid JWT & SALON_OWNER role.
 * Architecture ref: Phase 16.0 & Phase 16.4
 */
@ApiTags('Inventory (Salon Owner)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SALON_OWNER)
@Controller('owner/inventory')
export class InventoryOwnerController {
  constructor(
    private readonly productService: ProductService,
    private readonly supplierService: SupplierService,
    private readonly purchaseOrderService: PurchaseOrderService,
    private readonly goodsReceivedService: GoodsReceivedService,
    private readonly inventoryService: InventoryService,
    private readonly stockMovementService: StockMovementService,
    private readonly stockTransferService: StockTransferService,
    private readonly stockAdjustmentService: StockAdjustmentService,
    private readonly stockAuditService: StockAuditService,
    private readonly productUsageService: ProductUsageService,
    private readonly lowStockAlertService: LowStockAlertService,
  ) {}

  // ==========================================
  // 1. PRODUCT & VARIANT APIS
  // ==========================================

  @Post('products')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new product with variants' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiConflictResponse({ description: 'Barcode or SKU uniqueness violation' })
  public async createProduct(@Body() dto: CreateProductDto, @CurrentUser() user: any) {
    const product = await this.productService.createProduct(dto, user.id);
    return ResponseBuilder.created(plainToInstance(ProductDto, product), 'Product created successfully');
  }

  @Get('products')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search salon products (Paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated product list' })
  public async searchProducts(@Query() query: SearchProductQueryDto) {
    const normParams = PaginationUtil.normalizeParams(query.page, query.limit);
    const result = await this.productService.searchProducts({
      ...query,
      page: normParams.page,
      limit: normParams.limit,
    });
    return ResponseBuilder.paginated(
      result.data.map((p) => plainToInstance(ProductDto, p)),
      PaginationUtil.buildMeta(result.total, normParams),
      'Products retrieved successfully',
    );
  }

  @Get('products/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get product details by ID' })
  @ApiResponse({ status: 200, description: 'Product details returned' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  public async getProduct(@Param('id', ParseUUIDPipe) id: string, @Query('salonId', ParseUUIDPipe) salonId: string) {
    const product = await this.productService.getProduct(id, salonId);
    return ResponseBuilder.success(plainToInstance(ProductDto, product), 'Product retrieved successfully');
  }

  @Patch('products/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update product details' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  public async updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('salonId', ParseUUIDPipe) salonId: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: any,
  ) {
    const updated = await this.productService.updateProduct(id, salonId, dto, user.id);
    return ResponseBuilder.success(plainToInstance(ProductDto, updated), 'Product updated successfully');
  }

  @Post('products/:id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive (soft-delete) a product' })
  @ApiResponse({ status: 200, description: 'Product archived successfully' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  public async archiveProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('salonId', ParseUUIDPipe) salonId: string,
    @CurrentUser() user: any,
  ) {
    const archived = await this.productService.archiveProduct(id, salonId, user.id);
    return ResponseBuilder.success(plainToInstance(ProductDto, archived), 'Product archived successfully');
  }

  @Post('products/:id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore an archived product' })
  @ApiResponse({ status: 200, description: 'Product restored successfully' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  public async restoreProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('salonId', ParseUUIDPipe) salonId: string,
    @CurrentUser() user: any,
  ) {
    const restored = await this.productService.restoreProduct(id, salonId, user.id);
    return ResponseBuilder.success(plainToInstance(ProductDto, restored), 'Product restored successfully');
  }

  @Post('products/:id/variants')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new variant to a product' })
  @ApiResponse({ status: 201, description: 'Variant created successfully' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiConflictResponse({ description: 'SKU or Barcode uniqueness violation' })
  public async createVariant(
    @Param('id', ParseUUIDPipe) productId: string,
    @Query('salonId', ParseUUIDPipe) salonId: string,
    @Body() dto: CreateProductVariantDto,
    @CurrentUser() user: any,
  ) {
    const variant = await this.productService.createVariant(productId, salonId, dto, user.id);
    return ResponseBuilder.created(plainToInstance(ProductVariantDto, variant), 'Variant created successfully');
  }

  @Patch('variants/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update product variant details' })
  @ApiResponse({ status: 200, description: 'Variant updated successfully' })
  @ApiNotFoundResponse({ description: 'Variant not found' })
  public async updateVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('salonId', ParseUUIDPipe) salonId: string,
    @Body() dto: UpdateProductVariantDto,
    @CurrentUser() user: any,
  ) {
    const updated = await this.productService.updateVariant(id, salonId, dto, user.id);
    return ResponseBuilder.success(plainToInstance(ProductVariantDto, updated), 'Variant updated successfully');
  }

  @Get('variants/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get product variant details' })
  @ApiResponse({ status: 200, description: 'Variant details returned' })
  @ApiNotFoundResponse({ description: 'Variant not found' })
  public async getVariant(@Param('id', ParseUUIDPipe) id: string, @Query('salonId', ParseUUIDPipe) salonId: string) {
    const variant = await this.productService.getVariant(id, salonId);
    return ResponseBuilder.success(plainToInstance(ProductVariantDto, variant), 'Variant retrieved successfully');
  }

  @Post('variants/:id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a product variant' })
  @ApiResponse({ status: 200, description: 'Variant archived successfully' })
  @ApiNotFoundResponse({ description: 'Variant not found' })
  public async archiveVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('salonId', ParseUUIDPipe) salonId: string,
    @CurrentUser() user: any,
  ) {
    const archived = await this.productService.archiveVariant(id, salonId, user.id);
    return ResponseBuilder.success(plainToInstance(ProductVariantDto, archived), 'Variant archived successfully');
  }

  // ==========================================
  // 2. SUPPLIER APIS
  // ==========================================

  @Post('suppliers')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new supplier' })
  @ApiResponse({ status: 201, description: 'Supplier registered successfully' })
  @ApiConflictResponse({ description: 'Supplier code already exists' })
  public async createSupplier(@Body() dto: CreateSupplierDto, @CurrentUser() user: any) {
    const supplier = await this.supplierService.createSupplier(dto, user.id);
    return ResponseBuilder.created(plainToInstance(SupplierDto, supplier), 'Supplier created successfully');
  }

  @Get('suppliers')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search suppliers (Paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated suppliers list' })
  public async searchSuppliers(@Query() query: SearchSupplierQueryDto) {
    const normParams = PaginationUtil.normalizeParams(query.page, query.limit);
    const result = await this.supplierService.searchSuppliers({
      ...query,
      page: normParams.page,
      limit: normParams.limit,
    });
    return ResponseBuilder.paginated(
      result.data.map((s) => plainToInstance(SupplierDto, s)),
      PaginationUtil.buildMeta(result.total, normParams),
      'Suppliers retrieved successfully',
    );
  }

  @Get('suppliers/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get supplier details by ID' })
  @ApiResponse({ status: 200, description: 'Supplier details returned' })
  @ApiNotFoundResponse({ description: 'Supplier not found' })
  public async getSupplier(@Param('id', ParseUUIDPipe) id: string, @Query('salonId', ParseUUIDPipe) salonId: string) {
    const supplier = await this.supplierService.getSupplier(id, salonId);
    return ResponseBuilder.success(plainToInstance(SupplierDto, supplier), 'Supplier retrieved successfully');
  }

  @Patch('suppliers/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update supplier details' })
  @ApiResponse({ status: 200, description: 'Supplier updated successfully' })
  @ApiNotFoundResponse({ description: 'Supplier not found' })
  public async updateSupplier(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('salonId', ParseUUIDPipe) salonId: string,
    @Body() dto: UpdateSupplierDto,
    @CurrentUser() user: any,
  ) {
    const updated = await this.supplierService.updateSupplier(id, salonId, dto, user.id);
    return ResponseBuilder.success(plainToInstance(SupplierDto, updated), 'Supplier updated successfully');
  }

  @Post('suppliers/:id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a supplier' })
  @ApiResponse({ status: 200, description: 'Supplier archived successfully' })
  @ApiNotFoundResponse({ description: 'Supplier not found' })
  public async archiveSupplier(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('salonId', ParseUUIDPipe) salonId: string,
    @CurrentUser() user: any,
  ) {
    const archived = await this.supplierService.archiveSupplier(id, salonId, user.id);
    return ResponseBuilder.success(plainToInstance(SupplierDto, archived), 'Supplier archived successfully');
  }

  @Post('suppliers/:id/contacts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a contact person to a supplier' })
  @ApiResponse({ status: 201, description: 'Contact added successfully' })
  public async addSupplierContact(
    @Param('id', ParseUUIDPipe) supplierId: string,
    @Query('salonId', ParseUUIDPipe) salonId: string,
    @Body() dto: CreateSupplierContactDto,
  ) {
    const contact = await this.supplierService.addSupplierContact(supplierId, salonId, dto);
    return ResponseBuilder.created(plainToInstance(SupplierContactDto, contact), 'Contact added successfully');
  }

  @Patch('supplier-contacts/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a supplier contact person' })
  @ApiResponse({ status: 200, description: 'Contact updated successfully' })
  public async updateSupplierContact(
    @Param('id', ParseUUIDPipe) contactId: string,
    @Query('supplierId', ParseUUIDPipe) supplierId: string,
    @Query('salonId', ParseUUIDPipe) salonId: string,
    @Body() dto: UpdateSupplierContactDto,
  ) {
    const updated = await this.supplierService.updateSupplierContact(contactId, supplierId, salonId, dto);
    return ResponseBuilder.success(plainToInstance(SupplierContactDto, updated), 'Contact updated successfully');
  }

  @Delete('supplier-contacts/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a supplier contact person' })
  @ApiResponse({ status: 200, description: 'Contact removed successfully' })
  public async removeSupplierContact(
    @Param('id', ParseUUIDPipe) contactId: string,
    @Query('supplierId', ParseUUIDPipe) supplierId: string,
    @Query('salonId', ParseUUIDPipe) salonId: string,
  ) {
    await this.supplierService.removeSupplierContact(contactId, supplierId, salonId);
    return ResponseBuilder.success(null, 'Contact removed successfully');
  }

  // ==========================================
  // 3. PURCHASE ORDER APIS
  // ==========================================

  @Post('purchase-orders')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a draft purchase order' })
  @ApiResponse({ status: 201, description: 'Purchase order created' })
  public async createPurchaseOrder(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() user: any) {
    const po = await this.purchaseOrderService.createPurchaseOrder(dto, user.id);
    return ResponseBuilder.created(plainToInstance(PurchaseOrderDto, po), 'Purchase order created successfully');
  }

  @Get('purchase-orders')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search and filter purchase orders' })
  @ApiResponse({ status: 200, description: 'Purchase orders list' })
  public async searchPurchaseOrders(
    @Query('salonId', ParseUUIDPipe) salonId: string,
    @Query('branchId') branchId?: string,
    @Query('status') status?: string,
  ) {
    const result = await this.purchaseOrderService.searchPurchaseOrders(salonId, branchId, status);
    return ResponseBuilder.success(
      result.data.map((p) => plainToInstance(PurchaseOrderDto, p)),
      'Purchase orders retrieved successfully',
    );
  }

  @Get('purchase-orders/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get purchase order details by ID' })
  @ApiResponse({ status: 200, description: 'Purchase order details' })
  @ApiNotFoundResponse({ description: 'Purchase order not found' })
  public async getPurchaseOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('salonId', ParseUUIDPipe) salonId: string,
  ) {
    const po = await this.purchaseOrderService.getPurchaseOrder(id, salonId);
    return ResponseBuilder.success(plainToInstance(PurchaseOrderDto, po), 'Purchase order retrieved successfully');
  }

  @Patch('purchase-orders/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update draft purchase order' })
  @ApiResponse({ status: 200, description: 'Purchase order updated' })
  public async updatePurchaseOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('salonId', ParseUUIDPipe) salonId: string,
    @Body() dto: UpdatePurchaseOrderDto,
    @CurrentUser() user: any,
  ) {
    const updated = await this.purchaseOrderService.updatePurchaseOrder(id, salonId, dto, user.id);
    return ResponseBuilder.success(plainToInstance(PurchaseOrderDto, updated), 'Purchase order updated successfully');
  }

  @Post('purchase-orders/:id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a draft purchase order for approval' })
  @ApiResponse({ status: 200, description: 'Purchase order submitted' })
  public async submitPurchaseOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('salonId', ParseUUIDPipe) salonId: string,
    @CurrentUser() user: any,
  ) {
    const submitted = await this.purchaseOrderService.submitPurchaseOrder(id, salonId, user.id);
    return ResponseBuilder.success(plainToInstance(PurchaseOrderDto, submitted), 'Purchase order submitted successfully');
  }

  @Post('purchase-orders/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a submitted purchase order' })
  @ApiResponse({ status: 200, description: 'Purchase order approved' })
  public async approvePurchaseOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('salonId', ParseUUIDPipe) salonId: string,
    @CurrentUser() user: any,
  ) {
    const approved = await this.purchaseOrderService.approvePurchaseOrder(id, salonId, user.id);
    return ResponseBuilder.success(plainToInstance(PurchaseOrderDto, approved), 'Purchase order approved successfully');
  }

  @Post('purchase-orders/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a submitted purchase order' })
  @ApiResponse({ status: 200, description: 'Purchase order rejected' })
  public async rejectPurchaseOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('salonId', ParseUUIDPipe) salonId: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    const rejected = await this.purchaseOrderService.rejectPurchaseOrder(id, salonId, reason ?? 'Rejected by owner', user.id);
    return ResponseBuilder.success(plainToInstance(PurchaseOrderDto, rejected), 'Purchase order rejected successfully');
  }

  @Post('purchase-orders/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a purchase order' })
  @ApiResponse({ status: 200, description: 'Purchase order cancelled' })
  public async cancelPurchaseOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('salonId', ParseUUIDPipe) salonId: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    const cancelled = await this.purchaseOrderService.cancelPurchaseOrder(id, salonId, reason ?? 'Cancelled by owner', user.id);
    return ResponseBuilder.success(plainToInstance(PurchaseOrderDto, cancelled), 'Purchase order cancelled successfully');
  }

  // ==========================================
  // 4. GOODS RECEIVED APIS (GRN)
  // ==========================================

  @Post('goods-received')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Receive goods against a purchase order (Create GRN)' })
  @ApiResponse({ status: 201, description: 'GRN created and stock updated' })
  public async receiveGoods(@Body() dto: CreateGoodsReceivedNoteDto, @CurrentUser() user: any) {
    const grn = await this.goodsReceivedService.receiveGoods(dto, user.id);
    return ResponseBuilder.created(plainToInstance(GoodsReceivedNoteDto, grn), 'Goods received successfully');
  }

  @Get('goods-received/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get Goods Received Note details by ID' })
  @ApiResponse({ status: 200, description: 'GRN details returned' })
  @ApiNotFoundResponse({ description: 'GRN not found' })
  public async getGRN(@Param('id', ParseUUIDPipe) id: string, @Query('salonId', ParseUUIDPipe) salonId: string) {
    const grn = await this.goodsReceivedService.getGRN(id, salonId);
    return ResponseBuilder.success(plainToInstance(GoodsReceivedNoteDto, grn), 'GRN retrieved successfully');
  }

  @Get('goods-received/purchase-order/:purchaseOrderId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all GRNs associated with a purchase order' })
  @ApiResponse({ status: 200, description: 'GRN list returned' })
  public async getGRNsByPurchaseOrder(
    @Param('purchaseOrderId', ParseUUIDPipe) poId: string,
    @Query('salonId', ParseUUIDPipe) salonId: string,
  ) {
    const list = await this.goodsReceivedService.getGRNsByPurchaseOrder(poId, salonId);
    return ResponseBuilder.success(
      list.map((g) => plainToInstance(GoodsReceivedNoteDto, g)),
      'GRNs retrieved successfully',
    );
  }

  @Post('goods-received/:id/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify a Goods Received Note' })
  @ApiResponse({ status: 200, description: 'GRN verified' })
  public async verifyGRN(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('salonId', ParseUUIDPipe) salonId: string,
    @CurrentUser() user: any,
  ) {
    const verified = await this.goodsReceivedService.verifyGRN(id, salonId, user.id);
    return ResponseBuilder.success(plainToInstance(GoodsReceivedNoteDto, verified), 'GRN verified successfully');
  }

  // ==========================================
  // 5. INVENTORY STOCK APIS
  // ==========================================

  @Get('stock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search and inspect branch inventory stock (Paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated stock records' })
  public async searchStock(@Query() query: SearchInventoryQueryDto) {
    const normParams = PaginationUtil.normalizeParams(query.page, query.limit);
    const result = await this.inventoryService.searchInventory({
      ...query,
      page: normParams.page,
      limit: normParams.limit,
    });
    return ResponseBuilder.paginated(
      result.data.map((s) => plainToInstance(InventoryStockDto, s)),
      PaginationUtil.buildMeta(result.total, normParams),
      'Stock records retrieved successfully',
    );
  }

  @Get('stock/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get stock record details by ID' })
  @ApiResponse({ status: 200, description: 'Stock record returned' })
  @ApiNotFoundResponse({ description: 'Stock record not found' })
  public async getStock(@Param('id', ParseUUIDPipe) id: string) {
    const stock = await this.inventoryService.getStock(id);
    return ResponseBuilder.success(plainToInstance(InventoryStockDto, stock), 'Stock record retrieved successfully');
  }

  @Get('stock/variant/:variantId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get stock details for a variant at a specific branch' })
  @ApiResponse({ status: 200, description: 'Stock details returned' })
  public async getStockByVariant(
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Query('branchId', ParseUUIDPipe) branchId: string,
    @Query('batchNumber') batchNumber?: string,
  ) {
    const stock = await this.inventoryService.getStockByVariant(branchId, variantId, batchNumber);
    return ResponseBuilder.success(stock ? plainToInstance(InventoryStockDto, stock) : null, 'Stock retrieved');
  }

  @Get('stock/low-stock/:branchId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get low stock inventory items for a branch' })
  @ApiResponse({ status: 200, description: 'Low stock items list' })
  public async getLowStock(@Param('branchId', ParseUUIDPipe) branchId: string) {
    const list = await this.inventoryService.getLowStock(branchId);
    return ResponseBuilder.success(
      list.map((s) => plainToInstance(InventoryStockDto, s)),
      'Low stock items retrieved',
    );
  }

  @Get('stock/expiring/:branchId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get expiring inventory items for a branch' })
  @ApiResponse({ status: 200, description: 'Expiring items list' })
  public async getExpiringStock(
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Query('thresholdDate') thresholdDate?: string,
  ) {
    const date = thresholdDate ? new Date(thresholdDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const list = await this.inventoryService.getExpiringStock(branchId, date);
    return ResponseBuilder.success(
      list.map((s) => plainToInstance(InventoryStockDto, s)),
      'Expiring items retrieved',
    );
  }

  @Get('stock/:id/availability')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check stock availability for a variant' })
  @ApiResponse({ status: 200, description: 'Availability status' })
  public async checkAvailability(
    @Param('id', ParseUUIDPipe) variantId: string,
    @Query('branchId', ParseUUIDPipe) branchId: string,
    @Query('quantity') quantity: number = 1,
  ) {
    const available = await this.inventoryService.checkAvailability(branchId, variantId, Number(quantity));
    return ResponseBuilder.success({ variantId, branchId, requestedQuantity: quantity, available }, 'Availability check complete');
  }

  @Post('stock/reserve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reserve stock for a service booking or order' })
  @ApiResponse({ status: 200, description: 'Stock reserved' })
  public async reserveStock(
    @Body('branchId', ParseUUIDPipe) branchId: string,
    @Body('productVariantId', ParseUUIDPipe) productVariantId: string,
    @Body('quantity') quantity: number,
    @Body('batchNumber') batchNumber: string = 'DEFAULT_BATCH',
    @CurrentUser() user: any,
  ) {
    const updated = await this.inventoryService.reserveStock(branchId, productVariantId, batchNumber, quantity, user.id);
    return ResponseBuilder.success(plainToInstance(InventoryStockDto, updated), 'Stock reserved successfully');
  }

  @Post('stock/release')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Release a prior stock reservation' })
  @ApiResponse({ status: 200, description: 'Stock reservation released' })
  public async releaseStock(
    @Body('branchId', ParseUUIDPipe) branchId: string,
    @Body('productVariantId', ParseUUIDPipe) productVariantId: string,
    @Body('quantity') quantity: number,
    @Body('batchNumber') batchNumber: string = 'DEFAULT_BATCH',
    @CurrentUser() user: any,
  ) {
    const updated = await this.inventoryService.releaseReservation(branchId, productVariantId, batchNumber, quantity, user.id);
    return ResponseBuilder.success(plainToInstance(InventoryStockDto, updated), 'Stock reservation released');
  }

  @Post('stock/increase')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Direct stock increment with movement ledger recording' })
  @ApiResponse({ status: 200, description: 'Stock increased' })
  public async increaseStock(
    @Body('salonId', ParseUUIDPipe) salonId: string,
    @Body('branchId', ParseUUIDPipe) branchId: string,
    @Body('productVariantId', ParseUUIDPipe) productVariantId: string,
    @Body('quantity') quantity: number,
    @Body('unitCostPrice') unitCostPrice: number,
    @Body('reason') reason: StockMovementType = StockMovementType.PURCHASE_RECEIPT,
    @Body('batchNumber') batchNumber: string = 'DEFAULT_BATCH',
    @CurrentUser() user: any,
  ) {
    const updated = await this.inventoryService.increaseStock(
      salonId,
      branchId,
      productVariantId,
      batchNumber,
      quantity,
      unitCostPrice,
      reason,
      user.id,
    );
    return ResponseBuilder.success(plainToInstance(InventoryStockDto, updated), 'Stock increased successfully');
  }

  @Post('stock/decrease')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Direct stock decrement with movement ledger recording' })
  @ApiResponse({ status: 200, description: 'Stock decreased' })
  public async decreaseStock(
    @Body('salonId', ParseUUIDPipe) salonId: string,
    @Body('branchId', ParseUUIDPipe) branchId: string,
    @Body('productVariantId', ParseUUIDPipe) productVariantId: string,
    @Body('quantity') quantity: number,
    @Body('reason') reason: StockMovementType = StockMovementType.INTERNAL_USE,
    @Body('batchNumber') batchNumber: string = 'DEFAULT_BATCH',
    @CurrentUser() user: any,
  ) {
    const updated = await this.inventoryService.decreaseStock(
      salonId,
      branchId,
      productVariantId,
      batchNumber,
      quantity,
      reason,
      user.id,
    );
    return ResponseBuilder.success(plainToInstance(InventoryStockDto, updated), 'Stock decreased successfully');
  }

  // ==========================================
  // 6. STOCK MOVEMENT LEDGER APIS
  // ==========================================

  @Get('movements')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search immutable stock movements ledger (Paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated stock movements' })
  public async searchMovements(@Query() query: SearchMovementQueryDto) {
    const normParams = PaginationUtil.normalizeParams(query.page, query.limit);
    const result = await this.stockMovementService.searchMovements({
      ...query,
      page: normParams.page,
      limit: normParams.limit,
    });
    return ResponseBuilder.paginated(
      result.data.map((m) => plainToInstance(StockMovementDto, m)),
      PaginationUtil.buildMeta(result.total, normParams),
      'Stock movements retrieved successfully',
    );
  }

  @Get('movements/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get stock movement details by ID' })
  @ApiResponse({ status: 200, description: 'Movement details' })
  public async getMovement(@Param('id', ParseUUIDPipe) id: string) {
    const movement = await this.stockMovementService.getMovement(id);
    return ResponseBuilder.success(plainToInstance(StockMovementDto, movement), 'Movement retrieved successfully');
  }

  @Get('movements/variant/:variantId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get movement history for a specific variant' })
  @ApiResponse({ status: 200, description: 'Movements list' })
  public async getMovementsByVariant(@Param('variantId', ParseUUIDPipe) variantId: string) {
    const list = await this.stockMovementService.getMovementsByVariant(variantId);
    return ResponseBuilder.success(
      list.map((m) => plainToInstance(StockMovementDto, m)),
      'Variant movements retrieved',
    );
  }

  @Get('movements/branch/:branchId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get movement history for a specific branch' })
  @ApiResponse({ status: 200, description: 'Movements list' })
  public async getMovementsByBranch(@Param('branchId', ParseUUIDPipe) branchId: string) {
    const list = await this.stockMovementService.getMovementsByBranch(branchId);
    return ResponseBuilder.success(
      list.map((m) => plainToInstance(StockMovementDto, m)),
      'Branch movements retrieved',
    );
  }

  @Get('movements/reference/:referenceType/:referenceId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get movements linked to a specific transaction reference' })
  @ApiResponse({ status: 200, description: 'Movements list' })
  public async getMovementsByReference(
    @Param('referenceType') referenceType: string,
    @Param('referenceId') referenceId: string,
  ) {
    const list = await this.stockMovementService.getMovementsByReference(referenceType, referenceId);
    return ResponseBuilder.success(
      list.map((m) => plainToInstance(StockMovementDto, m)),
      'Reference movements retrieved',
    );
  }

  // ==========================================
  // 7. STOCK TRANSFER APIS
  // ==========================================

  @Post('transfers')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a stock transfer between branches' })
  @ApiResponse({ status: 201, description: 'Stock transfer created' })
  public async createTransfer(@Body() dto: CreateStockTransferDto, @CurrentUser() user: any) {
    const transfer = await this.stockTransferService.createTransfer(dto, user.id);
    return ResponseBuilder.created(plainToInstance(StockTransferDto, transfer), 'Stock transfer created successfully');
  }

  @Get('transfers')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search and filter stock transfers (Paginated)' })
  @ApiResponse({ status: 200, description: 'Transfers list' })
  public async searchTransfers(@Query() query: SearchTransferQueryDto) {
    const normParams = PaginationUtil.normalizeParams(query.page, query.limit);
    const result = await this.stockTransferService.searchTransfers({
      ...query,
      page: normParams.page,
      limit: normParams.limit,
    });
    return ResponseBuilder.paginated(
      result.data.map((t) => plainToInstance(StockTransferDto, t)),
      PaginationUtil.buildMeta(result.total, normParams),
      'Transfers retrieved successfully',
    );
  }

  @Get('transfers/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get stock transfer details by ID' })
  @ApiResponse({ status: 200, description: 'Transfer details' })
  public async getTransfer(@Param('id', ParseUUIDPipe) id: string, @Query('salonId', ParseUUIDPipe) salonId: string) {
    const transfer = await this.stockTransferService.getTransfer(id, salonId);
    return ResponseBuilder.success(plainToInstance(StockTransferDto, transfer), 'Transfer retrieved successfully');
  }

  @Post('transfers/:id/dispatch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dispatch a stock transfer from source branch' })
  @ApiResponse({ status: 200, description: 'Transfer dispatched' })
  public async dispatchTransfer(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('salonId', ParseUUIDPipe) salonId: string,
    @CurrentUser() user: any,
  ) {
    const dispatched = await this.stockTransferService.dispatchTransfer(id, salonId, user.id);
    return ResponseBuilder.success(plainToInstance(StockTransferDto, dispatched), 'Transfer dispatched successfully');
  }

  @Post('transfers/:id/receive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive a stock transfer at destination branch' })
  @ApiResponse({ status: 200, description: 'Transfer received' })
  public async receiveTransfer(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('salonId', ParseUUIDPipe) salonId: string,
    @CurrentUser() user: any,
  ) {
    const received = await this.stockTransferService.receiveTransfer(id, salonId, user.id);
    return ResponseBuilder.success(plainToInstance(StockTransferDto, received), 'Transfer received successfully');
  }

  @Post('transfers/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a pending stock transfer' })
  @ApiResponse({ status: 200, description: 'Transfer cancelled' })
  public async cancelTransfer(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('salonId', ParseUUIDPipe) salonId: string,
    @CurrentUser() user: any,
  ) {
    const cancelled = await this.stockTransferService.cancelTransfer(id, salonId, user.id);
    return ResponseBuilder.success(plainToInstance(StockTransferDto, cancelled), 'Transfer cancelled successfully');
  }

  // ==========================================
  // 8. STOCK ADJUSTMENT APIS
  // ==========================================

  @Post('adjustments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a stock adjustment (damage, shrinkage, expiry)' })
  @ApiResponse({ status: 201, description: 'Adjustment created (pending approval)' })
  public async createAdjustment(@Body() dto: CreateStockAdjustmentDto, @CurrentUser() user: any) {
    const adjustment = await this.stockAdjustmentService.createAdjustment(dto, user.id);
    return ResponseBuilder.created(plainToInstance(StockAdjustmentDto, adjustment), 'Adjustment submitted for approval');
  }

  @Get('adjustments/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get stock adjustment details by ID' })
  @ApiResponse({ status: 200, description: 'Adjustment details' })
  public async getAdjustment(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('salonId', ParseUUIDPipe) salonId: string,
  ) {
    const adjustment = await this.stockAdjustmentService.getAdjustment(id, salonId);
    return ResponseBuilder.success(plainToInstance(StockAdjustmentDto, adjustment), 'Adjustment retrieved successfully');
  }

  @Get('adjustments/branch/:branchId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all adjustments for a branch' })
  @ApiResponse({ status: 200, description: 'Adjustments list' })
  public async getAdjustmentsByBranch(@Param('branchId', ParseUUIDPipe) branchId: string) {
    const list = await this.stockAdjustmentService.getAdjustmentsByBranch(branchId);
    return ResponseBuilder.success(
      list.map((a) => plainToInstance(StockAdjustmentDto, a)),
      'Branch adjustments retrieved',
    );
  }

  @Post('adjustments/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve and apply a stock adjustment to inventory' })
  @ApiResponse({ status: 200, description: 'Adjustment approved and stock mutated' })
  public async approveAdjustment(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('salonId', ParseUUIDPipe) salonId: string,
    @CurrentUser() user: any,
  ) {
    const approved = await this.stockAdjustmentService.approveAdjustment(id, salonId, user.id);
    return ResponseBuilder.success(plainToInstance(StockAdjustmentDto, approved), 'Adjustment approved successfully');
  }

  @Post('adjustments/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a pending stock adjustment' })
  @ApiResponse({ status: 200, description: 'Adjustment rejected' })
  public async rejectAdjustment(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('salonId', ParseUUIDPipe) salonId: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    const rejected = await this.stockAdjustmentService.rejectAdjustment(
      id,
      salonId,
      reason ?? 'Rejected by owner',
      user.id,
    );
    return ResponseBuilder.success(plainToInstance(StockAdjustmentDto, rejected), 'Adjustment rejected successfully');
  }

  // ==========================================
  // 9. STOCK AUDIT APIS
  // ==========================================

  @Post('audits')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Plan a new physical stock audit / count' })
  @ApiResponse({ status: 201, description: 'Stock audit planned' })
  public async createAudit(@Body() dto: CreateStockAuditDto, @CurrentUser() user: any) {
    const audit = await this.stockAuditService.createAudit(dto, user.id);
    return ResponseBuilder.created(plainToInstance(StockAuditDto, audit), 'Stock audit created successfully');
  }

  @Get('audits')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search and filter stock audits (Paginated)' })
  @ApiResponse({ status: 200, description: 'Audits list' })
  public async searchAudits(@Query() query: SearchAuditQueryDto) {
    const normParams = PaginationUtil.normalizeParams(query.page, query.limit);
    const result = await this.stockAuditService.searchAudits({
      ...query,
      page: normParams.page,
      limit: normParams.limit,
    });
    return ResponseBuilder.paginated(
      result.data.map((a) => plainToInstance(StockAuditDto, a)),
      PaginationUtil.buildMeta(result.total, normParams),
      'Stock audits retrieved successfully',
    );
  }

  @Get('audits/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get stock audit details by ID' })
  @ApiResponse({ status: 200, description: 'Audit details' })
  public async getAudit(@Param('id', ParseUUIDPipe) id: string, @Query('salonId', ParseUUIDPipe) salonId: string) {
    const audit = await this.stockAuditService.getAudit(id, salonId);
    return ResponseBuilder.success(plainToInstance(StockAuditDto, audit), 'Audit retrieved successfully');
  }

  @Post('audits/:id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start a planned stock audit' })
  @ApiResponse({ status: 200, description: 'Audit started' })
  public async startAudit(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('salonId', ParseUUIDPipe) salonId: string,
    @CurrentUser() user: any,
  ) {
    const started = await this.stockAuditService.startAudit(id, salonId, user.id);
    return ResponseBuilder.success(plainToInstance(StockAuditDto, started), 'Audit started successfully');
  }

  @Post('audits/:id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete an audit and reconcile variances to inventory' })
  @ApiResponse({ status: 200, description: 'Audit completed and variances reconciled' })
  public async completeAudit(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('salonId', ParseUUIDPipe) salonId: string,
    @CurrentUser() user: any,
  ) {
    const completed = await this.stockAuditService.completeAudit(id, salonId, user.id);
    return ResponseBuilder.success(plainToInstance(StockAuditDto, completed), 'Audit completed and reconciled');
  }

  @Post('audits/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an audit' })
  @ApiResponse({ status: 200, description: 'Audit cancelled' })
  public async cancelAudit(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('salonId', ParseUUIDPipe) salonId: string,
    @CurrentUser() user: any,
  ) {
    const cancelled = await this.stockAuditService.cancelAudit(id, salonId, user.id);
    return ResponseBuilder.success(plainToInstance(StockAuditDto, cancelled), 'Audit cancelled successfully');
  }

  // ==========================================
  // 10. PRODUCT USAGE APIS
  // ==========================================

  @Post('usage')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record internal product usage / salon service consumption' })
  @ApiResponse({ status: 201, description: 'Usage recorded and stock deducted' })
  public async recordUsage(@Body() dto: CreateProductUsageDto, @CurrentUser() user: any) {
    const usage = await this.productUsageService.recordUsage(dto, user.id);
    return ResponseBuilder.created(plainToInstance(ProductUsageDto, usage), 'Product usage recorded successfully');
  }

  @Get('usage/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get product usage record by ID' })
  @ApiResponse({ status: 200, description: 'Usage record' })
  public async getUsage(@Param('id', ParseUUIDPipe) id: string, @Query('salonId', ParseUUIDPipe) salonId: string) {
    const usage = await this.productUsageService.getUsage(id, salonId);
    return ResponseBuilder.success(plainToInstance(ProductUsageDto, usage), 'Usage record retrieved successfully');
  }

  @Get('usage/product/:variantId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all usage records for a variant' })
  @ApiResponse({ status: 200, description: 'Usage list' })
  public async getUsageByProduct(@Param('variantId', ParseUUIDPipe) variantId: string) {
    const list = await this.productUsageService.getUsageByProduct(variantId);
    return ResponseBuilder.success(
      list.map((u) => plainToInstance(ProductUsageDto, u)),
      'Product usage records retrieved',
    );
  }

  @Get('usage/branch/:branchId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all usage records for a branch' })
  @ApiResponse({ status: 200, description: 'Usage list' })
  public async getUsageByBranch(@Param('branchId', ParseUUIDPipe) branchId: string) {
    const list = await this.productUsageService.getUsageByBranch(branchId);
    return ResponseBuilder.success(
      list.map((u) => plainToInstance(ProductUsageDto, u)),
      'Branch usage records retrieved',
    );
  }

  @Get('usage/reference/:referenceType/:referenceId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get usage linked to a specific transaction reference' })
  @ApiResponse({ status: 200, description: 'Usage list' })
  public async getUsageByReference(
    @Param('referenceType') referenceType: string,
    @Param('referenceId') referenceId: string,
  ) {
    const list = await this.productUsageService.getUsageByReference(referenceType, referenceId);
    return ResponseBuilder.success(
      list.map((u) => plainToInstance(ProductUsageDto, u)),
      'Reference usage records retrieved',
    );
  }

  // ==========================================
  // 11. LOW STOCK ALERT APIS
  // ==========================================

  @Get('alerts/low-stock/:branchId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get active low stock alerts for a branch' })
  @ApiResponse({ status: 200, description: 'Active alerts list' })
  public async getActiveAlerts(@Param('branchId', ParseUUIDPipe) branchId: string) {
    const list = await this.lowStockAlertService.getActiveAlerts(branchId);
    return ResponseBuilder.success(
      list.map((a) => plainToInstance(LowStockAlertDto, a)),
      'Active low stock alerts retrieved',
    );
  }

  @Post('alerts/evaluate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually trigger low stock reorder point evaluation for a variant' })
  @ApiResponse({ status: 200, description: 'Evaluation result' })
  public async evaluateStock(
    @Body('branchId', ParseUUIDPipe) branchId: string,
    @Body('productVariantId', ParseUUIDPipe) productVariantId: string,
    @CurrentUser() user: any,
  ) {
    const alert = await this.lowStockAlertService.evaluateStockLevel(branchId, productVariantId, user.id);
    return ResponseBuilder.success(alert ? plainToInstance(LowStockAlertDto, alert) : null, 'Stock level evaluated');
  }

  @Post('alerts/:id/acknowledge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Acknowledge an active low stock alert' })
  @ApiResponse({ status: 200, description: 'Alert acknowledged' })
  public async acknowledgeAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('salonId', ParseUUIDPipe) salonId: string,
    @CurrentUser() user: any,
  ) {
    const updated = await this.lowStockAlertService.acknowledgeAlert(id, salonId, user.id);
    return ResponseBuilder.success(plainToInstance(LowStockAlertDto, updated), 'Alert acknowledged successfully');
  }

  @Post('alerts/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve an acknowledged low stock alert' })
  @ApiResponse({ status: 200, description: 'Alert resolved' })
  public async resolveAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('salonId', ParseUUIDPipe) salonId: string,
    @CurrentUser() user: any,
  ) {
    const updated = await this.lowStockAlertService.resolveAlert(id, salonId, user.id);
    return ResponseBuilder.success(plainToInstance(LowStockAlertDto, updated), 'Alert resolved successfully');
  }
}
