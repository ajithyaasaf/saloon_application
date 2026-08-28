import { SalonPlanType } from '@prisma/client';

/**
 * UpdateSalonDto — Input data for updating an existing Salon aggregate profile.
 *
 * Architecture ref: Phase 10.0 §5
 */
export interface UpdateSalonDto {
  brandName?: string;
  description?: string;
  gstin?: string;
  planType?: SalonPlanType;
  logoMediaId?: string;
}
