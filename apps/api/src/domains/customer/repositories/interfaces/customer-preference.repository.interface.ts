import { CustomerPreference } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';
import { CreateCustomerPreferenceDto, UpdateCustomerPreferenceDto } from '../../dto/customer-preference.dto';

export interface ICustomerPreferenceRepository {
  findByCustomer(customerProfileId: string, tx?: PrismaTransaction): Promise<CustomerPreference | null>;
  create(dto: CreateCustomerPreferenceDto, tx?: PrismaTransaction): Promise<CustomerPreference>;
  update(customerProfileId: string, dto: UpdateCustomerPreferenceDto, tx?: PrismaTransaction): Promise<CustomerPreference>;
}
