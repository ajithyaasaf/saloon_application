import { CustomerTag } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';
import { CreateCustomerTagDto, UpdateCustomerTagDto } from '../../dto/customer-tag.dto';

export interface ICustomerTagRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<CustomerTag | null>;
  findBySalon(salonId: string, tx?: PrismaTransaction): Promise<CustomerTag[]>;
  findByName(salonId: string, name: string, tx?: PrismaTransaction): Promise<CustomerTag | null>;
  create(dto: CreateCustomerTagDto, createdByUserId: string, tx?: PrismaTransaction): Promise<CustomerTag>;
  update(id: string, dto: UpdateCustomerTagDto, updatedByUserId: string, tx?: PrismaTransaction): Promise<CustomerTag>;
  softDelete(id: string, updatedByUserId: string, tx?: PrismaTransaction): Promise<CustomerTag>;
}
