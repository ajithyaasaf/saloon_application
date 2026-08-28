import { Injectable, Logger } from '@nestjs/common';
import { CustomerTagAssignment, Prisma } from '@prisma/client';
import { ERROR_CODES } from '../../../common/error-codes/error-codes.constant';
import { ConflictException } from '../../../common/exceptions/conflict.exception';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaTransaction } from '../../../shared/transaction/interfaces/transaction-service.interface';
import { ICustomerTagAssignmentRepository } from './interfaces/customer-tag-assignment.repository.interface';

@Injectable()
export class CustomerTagAssignmentRepository implements ICustomerTagAssignmentRepository {
  private readonly logger = new Logger(CustomerTagAssignmentRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findByCustomer(customerProfileId: string, tx?: PrismaTransaction): Promise<CustomerTagAssignment[]> {
    const client = tx ?? this.prisma;
    return client.customerTagAssignment.findMany({
      where: { customerProfileId },
      include: { tag: true },
    });
  }

  public async assign(customerProfileId: string, tagId: string, assignedByUserId: string, tx?: PrismaTransaction): Promise<CustomerTagAssignment> {
    const client = tx ?? this.prisma;
    try {
      return await client.customerTagAssignment.create({
        data: {
          customerProfileId,
          tagId,
          assignedByUserId,
        },
        include: { tag: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(ERROR_CODES.DATABASE.UNIQUE_VIOLATION, 'Tag already assigned to this customer');
      }
      this.logger.error(`Failed to assign CustomerTag: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseException('Failed to assign customer tag');
    }
  }

  public async remove(customerProfileId: string, tagId: string, tx?: PrismaTransaction): Promise<boolean> {
    const client = tx ?? this.prisma;
    try {
      await client.customerTagAssignment.delete({
        where: {
          customerProfileId_tagId: {
            customerProfileId,
            tagId,
          },
        },
      });
      return true;
    } catch (error) {
      this.logger.error(`Failed to remove CustomerTag: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}
