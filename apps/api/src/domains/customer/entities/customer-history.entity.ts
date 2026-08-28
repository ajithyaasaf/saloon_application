export class CustomerVisitHistoryEntity {
  id: string;
  customerProfileId: string;
  bookingId: string;
  branchId: string;
  staffIds: string[];
  serviceIds: string[];
  totalAmount: number;
  visitDate: Date;
  createdAt: Date;

  constructor(partial: Partial<CustomerVisitHistoryEntity>) {
    Object.assign(this, partial);
  }
}

export class CustomerMergeHistoryEntity {
  id: string;
  sourceCustomerProfileId: string;
  targetCustomerProfileId: string;
  sourceSnapshot: any;
  mergeReason?: string | null;
  mergedByUserId: string;
  mergedAt: Date;

  constructor(partial: Partial<CustomerMergeHistoryEntity>) {
    Object.assign(this, partial);
  }
}
