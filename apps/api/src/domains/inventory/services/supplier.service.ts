import { Injectable, Logger } from '@nestjs/common';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { AuditService } from '../../../shared/audit/audit.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { TransactionService } from '../../../shared/transaction/transaction.service';
import { CreateSupplierDto, UpdateSupplierDto } from '../dto/supplier.dto';
import { SearchSupplierQueryDto } from '../dto/search-inventory.dto';
import { SupplierContactEntity, SupplierEntity } from '../entities/supplier.entity';
import { SupplierCreatedEvent, SupplierUpdatedEvent } from '../events/inventory-events.event';
import { SupplierContactRepository, SupplierRepository } from '../repositories/supplier.repository';

@Injectable()
export class SupplierService {
  private readonly logger = new Logger(SupplierService.name);

  constructor(
    private readonly supplierRepo: SupplierRepository,
    private readonly contactRepo: SupplierContactRepository,
    private readonly transactionService: TransactionService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly eventBus: EventBusService,
  ) {}

  public async createSupplier(dto: CreateSupplierDto, actorUserId: string): Promise<SupplierEntity> {
    const existing = await this.supplierRepo.findByCode(dto.salonId, dto.code);
    if (existing) {
      throw new ConflictException(ERROR_CODES.DATABASE.UNIQUE_VIOLATION, `Supplier code ${dto.code} already exists for this salon`);
    }

    const supplier = await this.transactionService.run(async (tx) => {
      const created = await this.supplierRepo.create(dto);
      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'SALON_OWNER',
        action: 'CREATE',
        entityType: 'Supplier',
        entityId: created.id,
        newState: created as any,
      });
      return created;
    });

    await this.eventBus.publish(
      new SupplierCreatedEvent(
        {
          supplierId: supplier.id,
          salonId: supplier.salonId,
          code: supplier.code,
          name: supplier.name,
        },
        actorUserId,
      ),
    );

    return new SupplierEntity(supplier as any);
  }

  public async updateSupplier(
    id: string,
    salonId: string,
    dto: UpdateSupplierDto,
    actorUserId: string,
  ): Promise<SupplierEntity> {
    const existing = await this.supplierRepo.findById(id);
    if (!existing || existing.salonId !== salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.SUPPLIER_NOT_FOUND, 'Supplier not found for this salon');
    }

    const updated = await this.transactionService.run(async (tx) => {
      const res = await this.supplierRepo.update(id, dto);
      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'SALON_OWNER',
        action: 'UPDATE',
        entityType: 'Supplier',
        entityId: id,
        previousState: existing as any,
        newState: res as any,
      });
      return res;
    });

    await this.cacheService.delete(`supplier:${id}:detail`);
    await this.eventBus.publish(
      new SupplierUpdatedEvent(
        {
          supplierId: id,
          salonId,
          updatedFields: Object.keys(dto),
        },
        actorUserId,
      ),
    );

    return new SupplierEntity(updated as any);
  }

  public async archiveSupplier(id: string, salonId: string, actorUserId: string): Promise<SupplierEntity> {
    const existing = await this.supplierRepo.findById(id);
    if (!existing || existing.salonId !== salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.SUPPLIER_NOT_FOUND, 'Supplier not found for this salon');
    }

    const archived = await this.transactionService.run(async (tx) => {
      const res = await this.supplierRepo.softDelete(id);
      await this.auditService.logInTransaction(tx, {
        actorId: actorUserId,
        actorRole: 'SALON_OWNER',
        action: 'ARCHIVE',
        entityType: 'Supplier',
        entityId: id,
        previousState: existing as any,
        newState: res as any,
      });
      return res;
    });

    await this.cacheService.delete(`supplier:${id}:detail`);
    return new SupplierEntity(archived as any);
  }

  public async getSupplier(id: string, salonId: string): Promise<SupplierEntity> {
    const cached = await this.cacheService.get<SupplierEntity>(`supplier:${id}:detail`);
    if (cached) return new SupplierEntity(cached);

    const supplier = await this.supplierRepo.findById(id);
    if (!supplier || supplier.salonId !== salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.SUPPLIER_NOT_FOUND, 'Supplier not found for this salon');
    }

    const entity = new SupplierEntity(supplier as any);
    await this.cacheService.set(`supplier:${id}:detail`, entity, 1800);
    return entity;
  }

  public async searchSuppliers(query: SearchSupplierQueryDto): Promise<{ data: SupplierEntity[]; total: number }> {
    const result = await this.supplierRepo.search(query);
    return {
      data: result.data.map((s) => new SupplierEntity(s as any)),
      total: result.total,
    };
  }

  public async addSupplierContact(supplierId: string, salonId: string, data: any): Promise<SupplierContactEntity> {
    const supplier = await this.supplierRepo.findById(supplierId);
    if (!supplier || supplier.salonId !== salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.SUPPLIER_NOT_FOUND, 'Supplier not found');
    }

    const contact = await this.contactRepo.create({
      supplierId,
      ...data,
    });
    await this.cacheService.delete(`supplier:${supplierId}:detail`);
    return new SupplierContactEntity(contact as any);
  }

  public async updateSupplierContact(
    contactId: string,
    supplierId: string,
    salonId: string,
    data: any,
  ): Promise<SupplierContactEntity> {
    const supplier = await this.supplierRepo.findById(supplierId);
    if (!supplier || supplier.salonId !== salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.SUPPLIER_NOT_FOUND, 'Supplier not found');
    }

    const contact = await this.contactRepo.findById(contactId);
    if (!contact || contact.supplierId !== supplierId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.SUPPLIER_NOT_FOUND, 'Supplier contact not found');
    }

    const updated = await this.contactRepo.update(contactId, data);
    await this.cacheService.delete(`supplier:${supplierId}:detail`);
    return new SupplierContactEntity(updated as any);
  }

  public async removeSupplierContact(contactId: string, supplierId: string, salonId: string): Promise<void> {
    const supplier = await this.supplierRepo.findById(supplierId);
    if (!supplier || supplier.salonId !== salonId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.SUPPLIER_NOT_FOUND, 'Supplier not found');
    }

    const contact = await this.contactRepo.findById(contactId);
    if (!contact || contact.supplierId !== supplierId) {
      throw new ResourceNotFoundException(ERROR_CODES.INVENTORY.SUPPLIER_NOT_FOUND, 'Supplier contact not found');
    }

    await this.contactRepo.delete(contactId);
    await this.cacheService.delete(`supplier:${supplierId}:detail`);
  }
}
