export class SupplierEntity {
  id: string;
  salonId: string;
  code: string;
  name: string;
  taxId?: string | null;
  paymentTerms?: string | null;
  leadTimeDays: number;
  status: string;
  rating?: number | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  contacts?: SupplierContactEntity[];

  constructor(partial: Partial<SupplierEntity>) {
    Object.assign(this, partial);
  }

  public isActive(): boolean {
    return this.status === 'ACTIVE' && !this.deletedAt;
  }
}

export class SupplierContactEntity {
  id: string;
  supplierId: string;
  contactName: string;
  designation?: string | null;
  phone: string;
  email?: string | null;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<SupplierContactEntity>) {
    Object.assign(this, partial);
  }
}
