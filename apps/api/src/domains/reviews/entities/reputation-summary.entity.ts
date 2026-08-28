export class SalonRatingSummaryEntity {
  id: string;
  salonId: string;
  totalReviews: number;
  averageRating: number;
  oneStarCount: number;
  twoStarCount: number;
  threeStarCount: number;
  fourStarCount: number;
  fiveStarCount: number;
  npsScore?: number | null;
  bayesianScore?: number | null;
  lastCalculatedAt: Date;

  constructor(partial: Partial<SalonRatingSummaryEntity>) {
    Object.assign(this, partial);
  }
}

export class BranchRatingSummaryEntity {
  id: string;
  branchId: string;
  salonId: string;
  totalReviews: number;
  averageRating: number;
  oneStarCount: number;
  twoStarCount: number;
  threeStarCount: number;
  fourStarCount: number;
  fiveStarCount: number;
  npsScore?: number | null;
  lastCalculatedAt: Date;

  constructor(partial: Partial<BranchRatingSummaryEntity>) {
    Object.assign(this, partial);
  }
}

export class StaffRatingSummaryEntity {
  id: string;
  staffId: string;
  salonId: string;
  totalReviews: number;
  averageRating: number;
  fiveStarRate: number;
  lastCalculatedAt: Date;

  constructor(partial: Partial<StaffRatingSummaryEntity>) {
    Object.assign(this, partial);
  }
}

export class ServiceRatingSummaryEntity {
  id: string;
  serviceId: string;
  salonId: string;
  totalReviews: number;
  averageRating: number;
  lastCalculatedAt: Date;

  constructor(partial: Partial<ServiceRatingSummaryEntity>) {
    Object.assign(this, partial);
  }
}
