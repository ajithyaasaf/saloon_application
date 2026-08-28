import { BlacklistType, CustomerStatus, Gender } from '@prisma/client';

export class CustomerProfileEntity {
  id: string;
  customerCode: string;
  userId?: string | null;
  salonId: string;
  primaryBranchId: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone: string;
  gender?: Gender | null;
  birthDate?: Date | null;
  anniversaryDate?: Date | null;
  status: CustomerStatus;
  walletBalance: number;
  lifetimeSpend: number;
  totalVisits: number;
  noShowCount: number;
  cancellationCount: number;
  lastVisitAt?: Date | null;
  isBlacklisted: boolean;
  blacklistType?: BlacklistType | null;
  blacklistReason?: string | null;
  blacklistedAt?: Date | null;
  blacklistedByUserId?: string | null;
  version: number;
  createdByUserId: string;
  updatedByUserId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  constructor(partial: Partial<CustomerProfileEntity>) {
    Object.assign(this, partial);
  }

  public isActive(): boolean {
    return this.status === CustomerStatus.ACTIVE && !this.deletedAt;
  }

  public isBlocked(): boolean {
    return this.status === CustomerStatus.BLOCKED || this.isBlacklisted;
  }

  public isArchived(): boolean {
    return this.status === CustomerStatus.ARCHIVED;
  }

  public canReceiveMarketing(): boolean {
    return this.isActive() && !this.isBlocked();
  }
}

export class CustomerPreferenceEntity {
  id: string;
  customerProfileId: string;
  preferredStaffIds: string[];
  preferredServiceIds: string[];
  marketingEmail: boolean;
  marketingSms: boolean;
  marketingWhatsapp: boolean;
  patchTestNotes?: string | null;
  beveragePreference?: string | null;
  updatedAt: Date;

  constructor(partial: Partial<CustomerPreferenceEntity>) {
    Object.assign(this, partial);
  }
}

export class CustomerNoteEntity {
  id: string;
  customerProfileId: string;
  branchId: string;
  note: string;
  isPinned: boolean;
  isPrivate: boolean;
  version: number;
  createdByUserId: string;
  updatedByUserId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  constructor(partial: Partial<CustomerNoteEntity>) {
    Object.assign(this, partial);
  }
}

export class CustomerTagEntity {
  id: string;
  salonId: string;
  name: string;
  color: string;
  description?: string | null;
  version: number;
  createdByUserId: string;
  updatedByUserId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  constructor(partial: Partial<CustomerTagEntity>) {
    Object.assign(this, partial);
  }
}
