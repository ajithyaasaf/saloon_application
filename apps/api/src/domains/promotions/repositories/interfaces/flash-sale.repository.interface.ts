import { FlashSale, FlashSaleStatus } from '@prisma/client';
import {
  CreateFlashSaleData,
  SearchFlashSaleQueryDto,
  UpdateFlashSaleData,
} from '../../dto/flash-sale.dto';

export interface IFlashSaleRepository {
  findById(id: string, salonId?: string): Promise<FlashSale | null>;
  findBySalon(salonId: string, status?: FlashSaleStatus): Promise<FlashSale[]>;
  findByBranch(branchId: string, status?: FlashSaleStatus): Promise<FlashSale[]>;
  findByService(serviceId: string, branchId?: string): Promise<FlashSale[]>;
  findByStatus(status: FlashSaleStatus, salonId?: string): Promise<FlashSale[]>;
  findActive(salonId?: string, branchId?: string): Promise<FlashSale[]>;
  findScheduled(salonId?: string, branchId?: string): Promise<FlashSale[]>;
  findCurrentlyActive(branchId?: string, checkTime?: Date): Promise<FlashSale[]>;
  search(query: SearchFlashSaleQueryDto): Promise<{ data: FlashSale[]; total: number }>;
  count(salonId?: string, branchId?: string, status?: FlashSaleStatus): Promise<number>;
  create(data: CreateFlashSaleData): Promise<FlashSale>;
  update(id: string, data: UpdateFlashSaleData, expectedVersion?: number): Promise<FlashSale>;
  updateStatus(id: string, status: FlashSaleStatus, expectedVersion?: number): Promise<FlashSale>;
  incrementBookedSlot(id: string, expectedVersion?: number): Promise<FlashSale>;
  decrementBookedSlot(id: string, expectedVersion?: number): Promise<FlashSale>;
  end(id: string, expectedVersion?: number): Promise<FlashSale>;
  cancel(id: string, expectedVersion?: number): Promise<FlashSale>;
  softDelete(id: string, salonId?: string): Promise<FlashSale>;
}
