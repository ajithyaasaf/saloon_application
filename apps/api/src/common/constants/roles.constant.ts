import { UserRole } from '@prisma/client';

export const ALL_USER_ROLES: UserRole[] = [
  UserRole.CUSTOMER,
  UserRole.SALON_OWNER,
  UserRole.SALON_STAFF,
  UserRole.SUPER_ADMIN,
  UserRole.SUPPORT_AGENT,
];
