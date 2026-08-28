import { Injectable } from '@nestjs/common';
import { Supplier, SupplierContact } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CreateSupplierDto, UpdateSupplierDto } from '../dto/supplier.dto';
import { SearchSupplierQueryDto } from '../dto/search-inventory.dto';
import { ISupplierContactRepository, ISupplierRepository } from './interfaces/supplier.repository.interface';

@Injectable()
export class SupplierRepository implements ISupplierRepository {
  constructor(private readonly db: PrismaService) {}

  public async findById(id: string): Promise<Supplier | null> {
    return this.db.supplier.findFirst({
      where: { id, deletedAt: null },
      include: { contacts: true },
    });
  }

  public async findByCode(salonId: string, code: string): Promise<Supplier | null> {
    return this.db.supplier.findFirst({
      where: { salonId, code, deletedAt: null },
    });
  }

  public async findBySalon(salonId: string): Promise<Supplier[]> {
    return this.db.supplier.findMany({
      where: { salonId, deletedAt: null },
      include: { contacts: true },
    });
  }

  public async search(query: SearchSupplierQueryDto): Promise<{ data: Supplier[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (query.salonId) where.salonId = query.salonId;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.db.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { contacts: true },
      }),
      this.db.supplier.count({ where }),
    ]);

    return { data, total };
  }

  public async create(dto: CreateSupplierDto): Promise<Supplier> {
    return this.db.supplier.create({
      data: {
        salonId: dto.salonId,
        code: dto.code,
        name: dto.name,
        taxId: dto.taxId,
        paymentTerms: dto.paymentTerms,
        leadTimeDays: dto.leadTimeDays ?? 7,
      },
    });
  }

  public async update(id: string, dto: UpdateSupplierDto): Promise<Supplier> {
    return this.db.supplier.update({
      where: { id },
      data: {
        ...dto,
        version: { increment: 1 },
      },
    });
  }

  public async softDelete(id: string): Promise<Supplier> {
    return this.db.supplier.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'INACTIVE' },
    });
  }
}

@Injectable()
export class SupplierContactRepository implements ISupplierContactRepository {
  constructor(private readonly db: PrismaService) {}

  public async findById(id: string): Promise<SupplierContact | null> {
    return this.db.supplierContact.findUnique({ where: { id } });
  }

  public async findBySupplier(supplierId: string): Promise<SupplierContact[]> {
    return this.db.supplierContact.findMany({ where: { supplierId } });
  }

  public async create(data: any): Promise<SupplierContact> {
    return this.db.supplierContact.create({ data });
  }

  public async update(id: string, data: any): Promise<SupplierContact> {
    return this.db.supplierContact.update({ where: { id }, data });
  }

  public async delete(id: string): Promise<void> {
    await this.db.supplierContact.delete({ where: { id } });
  }
}
