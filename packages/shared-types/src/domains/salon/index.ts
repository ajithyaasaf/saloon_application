import { BranchStatus, ClosureType, DayOfWeek, SalonStatus } from '../../enums/index.js';
import { GeoLocation } from '../../common/index.js';

export interface SalonDto {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  status: SalonStatus;
  ownerId: string;
  commissionRate?: number;
  contactEmail?: string | null;
  contactPhone?: string | null;
  gstin?: string | null;
  pan?: string | null;
  createdAt: string;
  updatedAt: string;
  branchesCount?: number;
}

export interface BranchOperatingHourDto {
  id?: string;
  dayOfWeek: DayOfWeek;
  isOpen: boolean;
  openTime: string; // "09:00"
  closeTime: string; // "20:00"
  breakStartTime?: string | null;
  breakEndTime?: string | null;
}

export interface BranchClosureDto {
  id: string;
  branchId: string;
  startDate: string;
  endDate: string;
  reason?: string | null;
  closureType: ClosureType;
  createdAt: string;
}

export interface BranchDto {
  id: string;
  salonId: string;
  name: string;
  slug: string;
  phone?: string | null;
  email?: string | null;
  status: BranchStatus;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  geoLocation?: GeoLocation | null;
  coverImageUrl?: string | null;
  photos?: string[];
  operatingHours?: BranchOperatingHourDto[];
  closures?: BranchClosureDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSalonRequestDto {
  name: string;
  description?: string;
  logoMediaId?: string;
  contactEmail?: string;
  contactPhone?: string;
  gstin?: string;
  pan?: string;
}

export interface UpdateSalonRequestDto {
  name?: string;
  description?: string;
  logoMediaId?: string;
  coverMediaId?: string;
  contactEmail?: string;
  contactPhone?: string;
  gstin?: string;
  pan?: string;
}

export interface CreateBranchRequestDto {
  name: string;
  phone?: string;
  email?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  coverMediaId?: string;
  operatingHours?: BranchOperatingHourDto[];
}

export interface UpdateBranchRequestDto {
  name?: string;
  phone?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  coverMediaId?: string;
  status?: BranchStatus;
  operatingHours?: BranchOperatingHourDto[];
}

export interface CreateBranchClosureDto {
  startDate: string;
  endDate: string;
  reason?: string;
  closureType: ClosureType;
}

export type SalonBrandDto = SalonDto;
export type BranchSummaryDto = BranchDto;
export type BranchHoursDto = BranchOperatingHourDto;
export type GeoLocationDto = GeoLocation;
