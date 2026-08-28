/**
 * ServiceCategoryEntity — Pure domain entity for master service category.
 * Free of NestJS, Prisma, and framework decorators.
 *
 * Architecture ref: Phase 11.0 & Phase 11.3
 */
export class ServiceCategoryEntity {
  constructor(
    public readonly id: string,
    public name: string,
    public displayOrder: number,
    public iconMediaId: string | null,
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
