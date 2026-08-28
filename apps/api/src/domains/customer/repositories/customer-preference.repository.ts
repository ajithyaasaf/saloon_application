import { Injectable, Logger } from '@nestjs/common';
import { CustomerPreference } from '@prisma/client';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { CreateCustomerPreferenceDto, UpdateCustomerPreferenceDto } from '../dto/customer-preference.dto';
import { ICustomerPreferenceRepository } from './interfaces/customer-preference.repository.interface';

@Injectable()
export class CustomerPreferenceRepository implements ICustomerPreferenceRepository {
  private readonly logger = new Logger(CustomerPreferenceRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findByCustomer(customerProfileId: string, tx?: PrismaTransaction): Promise<CustomerPreference | null> {
    const client = tx ?? this.prisma;
    return client.customerPreference.findUnique({
      where: { customerProfileId },
    });
  }

  public async create(dto: CreateCustomerPreferenceDto, tx?: PrismaTransaction): Promise<CustomerPreference> {
    const client = tx ?? this.prisma;
    try {
      return await client.customerPreference.create({
        data: {
          customerProfileId: dto.customerProfileId,
          preferredStaffIds: dto.preferredStaffIds ?? [],
          preferredServiceIds: dto.preferredServiceIds ?? [],
          marketingEmail: dto.marketingEmail ?? true,
          marketingSms: dto.marketingSms ?? true,
          marketingWhatsapp: dto.marketingWhatsapp ?? true,
          patchTestNotes: dto.patchTestNotes,
          beveragePreference: dto.beveragePreference,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create CustomerPreference: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseException('Failed to create customer preferences');
    }
  }

  public async update(customerProfileId: string, dto: UpdateCustomerPreferenceDto, tx?: PrismaTransaction): Promise<CustomerPreference> {
    const client = tx ?? this.prisma;
    try {
      return await client.customerPreference.update({
        where: { customerProfileId },
        data: {
          ...(dto.preferredStaffIds && { preferredStaffIds: dto.preferredStaffIds }),
          ...(dto.preferredServiceIds && { preferredServiceIds: dto.preferredServiceIds }),
          ...(dto.marketingEmail !== undefined && { marketingEmail: dto.marketingEmail }),
          ...(dto.marketingSms !== undefined && { marketingSms: dto.marketingSms }),
          ...(dto.marketingWhatsapp !== undefined && { marketingWhatsapp: dto.marketingWhatsapp }),
          ...(dto.patchTestNotes !== undefined && { patchTestNotes: dto.patchTestNotes }),
          ...(dto.beveragePreference !== undefined && { beveragePreference: dto.beveragePreference }),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to update CustomerPreference: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseException('Failed to update customer preferences');
    }
  }
}
