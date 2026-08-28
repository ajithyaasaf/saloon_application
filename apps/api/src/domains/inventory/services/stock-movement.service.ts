import { Injectable, Logger } from '@nestjs/common';
import { StockMovementType } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { SecurityUtil } from '../../../common/utils/security.util';
import { SearchMovementQueryDto } from '../dto/search-inventory.dto';
import { StockMovementEntity } from '../entities/stock-movement.entity';
import { StockMovementRepository } from '../repositories/stock-movement.repository';

@Injectable()
export class StockMovementService {
  private readonly logger = new Logger(StockMovementService.name);

  constructor(private readonly movementRepo: StockMovementRepository) {}

  public async recordMovement(data: {
    salonId: string;
    branchId: string;
    productVariantId: string;
    batchNumber?: string;
    type: StockMovementType;
    quantity: number;
    unitCostPrice?: number;
    totalValue?: number;
    previousQuantity: number;
    newQuantity: number;
    referenceType?: string;
    referenceId?: string;
    notes?: string;
    actorUserId: string;
  }): Promise<StockMovementEntity> {
    const movementCode = `SM-${data.salonId.slice(-4).toUpperCase()}-${Date.now().toString().slice(-6)}-${SecurityUtil.generateRandomToken(3).toUpperCase()}`;
    const created = await this.movementRepo.create({
      ...data,
      movementCode,
    });
    return new StockMovementEntity(created as any);
  }

  public async getMovement(id: string): Promise<StockMovementEntity> {
    const movement = await this.movementRepo.findById(id);
    if (!movement) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.STOCK_NOT_FOUND, 'Stock movement record not found');
    }
    return new StockMovementEntity(movement as any);
  }

  public async getMovementsByVariant(productVariantId: string): Promise<StockMovementEntity[]> {
    const list = await this.movementRepo.findByVariant(productVariantId);
    return list.map((m) => new StockMovementEntity(m as any));
  }

  public async getMovementsByBranch(branchId: string): Promise<StockMovementEntity[]> {
    const list = await this.movementRepo.findByBranch(branchId);
    return list.map((m) => new StockMovementEntity(m as any));
  }

  public async getMovementsByReference(referenceType: string, referenceId: string): Promise<StockMovementEntity[]> {
    const list = await this.movementRepo.findByReference(referenceType, referenceId);
    return list.map((m) => new StockMovementEntity(m as any));
  }

  public async searchMovements(query: SearchMovementQueryDto): Promise<{ data: StockMovementEntity[]; total: number }> {
    const result = await this.movementRepo.search(query);
    return {
      data: result.data.map((m) => new StockMovementEntity(m as any)),
      total: result.total,
    };
  }
}
