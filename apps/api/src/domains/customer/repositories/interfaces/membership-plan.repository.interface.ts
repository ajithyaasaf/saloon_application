import { MembershipPlan } from '@prisma/client';
import { PrismaTransaction } from '../../../../shared/transaction/interfaces/transaction-service.interface';
import { CreateMembershipPlanDto, UpdateMembershipPlanDto } from '../../dto/membership-plan.dto';

export interface IMembershipPlanRepository {
  findById(id: string, tx?: PrismaTransaction): Promise<MembershipPlan | null>;
  findBySalon(salonId: string, tx?: PrismaTransaction): Promise<MembershipPlan[]>;
  findByCode(salonId: string, planCode: string, tx?: PrismaTransaction): Promise<MembershipPlan | null>;
  create(dto: CreateMembershipPlanDto, createdByUserId: string, tx?: PrismaTransaction): Promise<MembershipPlan>;
  update(id: string, dto: UpdateMembershipPlanDto, updatedByUserId: string, tx?: PrismaTransaction): Promise<MembershipPlan>;
  softDelete(id: string, updatedByUserId: string, tx?: PrismaTransaction): Promise<MembershipPlan>;
}
