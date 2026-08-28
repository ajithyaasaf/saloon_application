import { BranchGenderCategory } from '@prisma/client';

/**
 * CreateBranchDto — Input data for adding a new Branch location to a Salon.
 *
 * Architecture ref: Phase 10.0 §5
 */
export interface CreateBranchDto {
  branchName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  phone: string;
  genderCategory?: BranchGenderCategory;
  coverMediaId?: string;
}
