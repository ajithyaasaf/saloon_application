import { BranchGenderCategory, SalonPlanType } from '@prisma/client';

/**
 * CreateSalonDto — Input data for creating a new Salon aggregate profile.
 *
 * Architecture ref: Phase 10.0 §5
 */
export interface CreateSalonDto {
  brandName: string;
  description?: string;
  gstin?: string;
  planType?: SalonPlanType;
  logoMediaId?: string;
  
  // Initial Primary Branch fields
  primaryBranchName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  phone: string;
  genderCategory?: BranchGenderCategory;
}
