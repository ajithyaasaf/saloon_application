import { Supplier, SupplierContact } from '@prisma/client';
import { CreateSupplierDto, UpdateSupplierDto } from '../../dto/supplier.dto';
import { SearchSupplierQueryDto } from '../../dto/search-inventory.dto';

export interface ISupplierRepository {
  findById(id: string): Promise<Supplier | null>;
  findByCode(salonId: string, code: string): Promise<Supplier | null>;
  findBySalon(salonId: string): Promise<Supplier[]>;
  search(query: SearchSupplierQueryDto): Promise<{ data: Supplier[]; total: number }>;
  create(dto: CreateSupplierDto): Promise<Supplier>;
  update(id: string, dto: UpdateSupplierDto): Promise<Supplier>;
  softDelete(id: string): Promise<Supplier>;
}

export interface ISupplierContactRepository {
  findById(id: string): Promise<SupplierContact | null>;
  findBySupplier(supplierId: string): Promise<SupplierContact[]>;
  create(data: any): Promise<SupplierContact>;
  update(id: string, data: any): Promise<SupplierContact>;
  delete(id: string): Promise<void>;
}
