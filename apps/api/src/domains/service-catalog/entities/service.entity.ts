import { BranchGenderCategory } from '@prisma/client';

/**
 * ServiceEntity — Pure domain entity for master service definition.
 * Free of NestJS, Prisma, and framework decorators.
 *
 * Architecture ref: Phase 11.0 & Phase 11.3
 */
export class ServiceEntity {
  constructor(
    public readonly id: string,
    public categoryId: string,
    public name: string,
    public description: string | null,
    public genderCategory: BranchGenderCategory,
    public coverMediaId: string | null,
    public version: number,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public deletedAt: Date | null = null,
  ) {}

  public isActive(): boolean {
    return this.deletedAt === null;
  }

  public isDeleted(): boolean {
    return this.deletedAt !== null;
  }
}
