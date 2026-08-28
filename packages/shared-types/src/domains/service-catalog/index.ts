import { Gender } from '../../enums/index.js';

export interface ServiceCategoryDto {
  id: string;
  salonId?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  iconUrl?: string | null;
  displayOrder: number;
  isActive: boolean;
  servicesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceDto {
  id: string;
  salonId: string;
  categoryId: string;
  categoryName?: string;
  name: string;
  slug: string;
  description?: string | null;
  targetGender: Gender;
  basePrice: number;
  durationMinutes: number;
  bufferMinutes: number;
  imageUrl?: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface BranchServiceDto {
  id: string;
  branchId: string;
  serviceId: string;
  service?: ServiceDto;
  customPrice?: number | null;
  effectivePrice: number;
  customDurationMinutes?: number | null;
  effectiveDurationMinutes: number;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceCategoryRequestDto {
  name: string;
  description?: string;
  iconMediaId?: string;
  displayOrder?: number;
}

export interface UpdateServiceCategoryRequestDto {
  name?: string;
  description?: string;
  iconMediaId?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface CreateServiceRequestDto {
  categoryId: string;
  name: string;
  description?: string;
  targetGender?: Gender;
  basePrice: number;
  durationMinutes: number;
  bufferMinutes?: number;
  coverMediaId?: string;
  displayOrder?: number;
}

export interface UpdateServiceRequestDto {
  categoryId?: string;
  name?: string;
  description?: string;
  targetGender?: Gender;
  basePrice?: number;
  durationMinutes?: number;
  bufferMinutes?: number;
  coverMediaId?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface ConfigureBranchServiceRequestDto {
  customPrice?: number;
  customDurationMinutes?: number;
  isAvailable?: boolean;
}

export type BranchServicePricingDto = BranchServiceDto;
export interface ServiceDurationDto {
  durationMinutes: number;
  bufferMinutes: number;
}
