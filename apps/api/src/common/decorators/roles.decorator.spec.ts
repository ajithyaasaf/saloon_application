import { UserRole } from '@prisma/client';

import { ROLES_KEY, Roles } from './roles.decorator';

describe('@Roles() decorator', () => {
  it('should export the ROLES_KEY constant as "roles"', () => {
    expect(ROLES_KEY).toBe('roles');
  });

  it('should set ROLES_KEY metadata with a single role', () => {
    class TestController {
      @Roles(UserRole.SUPER_ADMIN)
      handler(): void {}
    }

    const metadata = Reflect.getMetadata(ROLES_KEY, TestController.prototype.handler);
    expect(metadata).toEqual([UserRole.SUPER_ADMIN]);
  });

  it('should set ROLES_KEY metadata with multiple roles', () => {
    class TestController {
      @Roles(UserRole.SALON_OWNER, UserRole.SALON_STAFF)
      handler(): void {}
    }

    const metadata = Reflect.getMetadata(ROLES_KEY, TestController.prototype.handler);
    expect(metadata).toEqual([UserRole.SALON_OWNER, UserRole.SALON_STAFF]);
  });

  it('should support all UserRole enum values', () => {
    class TestController {
      @Roles(
        UserRole.CUSTOMER,
        UserRole.SALON_OWNER,
        UserRole.SALON_STAFF,
        UserRole.SUPER_ADMIN,
        UserRole.SUPPORT_AGENT,
      )
      handler(): void {}
    }

    const metadata = Reflect.getMetadata(ROLES_KEY, TestController.prototype.handler);
    expect(metadata).toHaveLength(5);
    expect(metadata).toContain(UserRole.CUSTOMER);
    expect(metadata).toContain(UserRole.SALON_OWNER);
    expect(metadata).toContain(UserRole.SALON_STAFF);
    expect(metadata).toContain(UserRole.SUPER_ADMIN);
    expect(metadata).toContain(UserRole.SUPPORT_AGENT);
  });

  it('should set metadata on a class-level decorator', () => {
    @Roles(UserRole.SUPER_ADMIN)
    class TestController {}

    const metadata = Reflect.getMetadata(ROLES_KEY, TestController);
    expect(metadata).toEqual([UserRole.SUPER_ADMIN]);
  });

  it('should produce independent metadata per route method', () => {
    class TestController {
      @Roles(UserRole.SALON_OWNER)
      ownerRoute(): void {}

      @Roles(UserRole.SUPER_ADMIN)
      adminRoute(): void {}
    }

    const ownerMeta = Reflect.getMetadata(ROLES_KEY, TestController.prototype.ownerRoute);
    const adminMeta = Reflect.getMetadata(ROLES_KEY, TestController.prototype.adminRoute);

    expect(ownerMeta).toEqual([UserRole.SALON_OWNER]);
    expect(adminMeta).toEqual([UserRole.SUPER_ADMIN]);
  });
});
