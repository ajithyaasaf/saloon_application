import { CustomerNote } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';
import { CreateCustomerNoteDto, UpdateCustomerNoteDto } from '../../dto/customer-note.dto';

export interface ICustomerNoteRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<CustomerNote | null>;
  findByCustomer(customerProfileId: string, tx?: PrismaTransaction): Promise<CustomerNote[]>;
  findByBranch(branchId: string, tx?: PrismaTransaction): Promise<CustomerNote[]>;
  create(dto: CreateCustomerNoteDto, createdByUserId: string, tx?: PrismaTransaction): Promise<CustomerNote>;
  update(id: string, dto: UpdateCustomerNoteDto, updatedByUserId: string, tx?: PrismaTransaction): Promise<CustomerNote>;
  softDelete(id: string, updatedByUserId: string, tx?: PrismaTransaction): Promise<CustomerNote>;
}
