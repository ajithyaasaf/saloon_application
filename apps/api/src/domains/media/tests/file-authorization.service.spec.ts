import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FileCategory, FileStatus, FileVisibility } from '@prisma/client';
import { FileAssetEntity } from '../entities/file-asset.entity';
import { FileAuthorizationService } from '../services/file-authorization.service';

describe('FileAuthorizationService - Access Control & IDOR Protection', () => {
  let authz: FileAuthorizationService;

  const tenantASalonId = 'salon-AAA';
  const tenantBSalonId = 'salon-BBB';
  const ownerUserA = 'user-owner-A';
  const staffUserA = 'user-staff-A';
  const customerUserA = 'user-customer-A';
  const customerUserB = 'user-customer-B';
  const adminUser = 'user-admin-root';

  const createAsset = (overrides: Partial<FileAssetEntity> = {}): FileAssetEntity =>
    new FileAssetEntity({
      id: 'asset-100',
      salonId: tenantASalonId,
      uploadedByUserId: staffUserA,
      originalFileName: 'document.pdf',
      storedFileName: 'stored-document.pdf',
      objectKey: `salons/${tenantASalonId}/documents/doc.pdf`,
      bucket: 'saloon-assets',
      provider: 'R2',
      mimeType: 'application/pdf',
      extension: 'pdf',
      sizeBytes: 10240,
      status: FileStatus.READY,
      visibility: FileVisibility.TENANT,
      category: FileCategory.DOCUMENT,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      ...overrides,
    });

  beforeEach(() => {
    authz = new FileAuthorizationService();
  });

  // ─── 1. Tenant Isolation ───────────────────────────────────────────────────

  describe('Tenant Isolation', () => {
    it('1. Same-tenant authorized read -> allowed', () => {
      const asset = createAsset({ visibility: FileVisibility.TENANT, status: FileStatus.READY });
      const actor = { userId: staffUserA, salonId: tenantASalonId, role: 'SALON_STAFF' };

      expect(authz.canRead(asset, actor)).toBe(true);
      expect(() => authz.assertCanRead(asset, actor)).not.toThrow();
    });

    it('2. Cross-tenant read denial -> denied and throws NotFoundException', () => {
      const asset = createAsset({ visibility: FileVisibility.TENANT, status: FileStatus.READY });
      const actorFromSalonB = { userId: 'user-staff-b', salonId: tenantBSalonId, role: 'SALON_STAFF' };

      expect(authz.canRead(asset, actorFromSalonB)).toBe(false);
      expect(() => authz.assertCanRead(asset, actorFromSalonB)).toThrow(NotFoundException);
    });

    it('3. Cross-tenant update denial -> throws NotFoundException to prevent IDOR existence leaks', () => {
      const asset = createAsset();
      const actorFromSalonB = { userId: 'user-owner-b', salonId: tenantBSalonId, role: 'SALON_OWNER' };

      expect(authz.canModify(asset, actorFromSalonB)).toBe(false);
      expect(() => authz.assertCanModify(asset, actorFromSalonB)).toThrow(NotFoundException);
    });

    it('3b. Cross-tenant update of AUTHENTICATED asset -> readable but throws ForbiddenException on modify', () => {
      const asset = createAsset({ visibility: FileVisibility.AUTHENTICATED, status: FileStatus.READY });
      const actorFromSalonB = { userId: 'user-owner-b', salonId: tenantBSalonId, role: 'SALON_OWNER' };

      expect(authz.canRead(asset, actorFromSalonB)).toBe(true);
      expect(authz.canModify(asset, actorFromSalonB)).toBe(false);
      expect(() => authz.assertCanModify(asset, actorFromSalonB)).toThrow(ForbiddenException);
    });

    it('4. Cross-tenant delete denial -> throws NotFoundException to prevent IDOR existence leaks', () => {
      const asset = createAsset();
      const actorFromSalonB = { userId: 'user-owner-b', salonId: tenantBSalonId, role: 'SALON_OWNER' };

      expect(authz.canDelete(asset, actorFromSalonB)).toBe(false);
      expect(() => authz.assertCanDelete(asset, actorFromSalonB)).toThrow(NotFoundException);
    });

    it('5. Cross-tenant restore denial -> throws NotFoundException to prevent IDOR leaks', () => {
      const asset = createAsset({ deletedAt: new Date(), status: FileStatus.DELETED });
      const actorFromSalonB = { userId: 'user-owner-b', salonId: tenantBSalonId, role: 'SALON_OWNER' };

      expect(authz.canRestore(asset, actorFromSalonB)).toBe(false);
      expect(() => authz.assertCanRestore(asset, actorFromSalonB)).toThrow(NotFoundException);
    });
  });

  // ─── 2. User Ownership & Private Visibility ────────────────────────────────

  describe('User Ownership & Visibility Rules', () => {
    it('6. Same-user PRIVATE read -> allowed for uploader', () => {
      const asset = createAsset({
        uploadedByUserId: customerUserA,
        salonId: null,
        visibility: FileVisibility.PRIVATE,
        status: FileStatus.READY,
      });
      const actor = { userId: customerUserA, role: 'CUSTOMER' };

      expect(authz.canRead(asset, actor)).toBe(true);
      expect(() => authz.assertCanRead(asset, actor)).not.toThrow();
    });

    it('7. Different-user PRIVATE read denial -> throws NotFoundException', () => {
      const asset = createAsset({
        uploadedByUserId: customerUserA,
        salonId: null,
        visibility: FileVisibility.PRIVATE,
        status: FileStatus.READY,
      });
      const actor = { userId: customerUserB, role: 'CUSTOMER' };

      expect(authz.canRead(asset, actor)).toBe(false);
      expect(() => authz.assertCanRead(asset, actor)).toThrow(NotFoundException);
    });

    it('8. Salon owner can read PRIVATE salon asset in their salon', () => {
      const asset = createAsset({
        uploadedByUserId: staffUserA,
        salonId: tenantASalonId,
        visibility: FileVisibility.PRIVATE,
        status: FileStatus.READY,
      });
      const ownerActor = { userId: ownerUserA, salonId: tenantASalonId, role: 'SALON_OWNER' };

      expect(authz.canRead(asset, ownerActor)).toBe(true);
      expect(() => authz.assertCanRead(asset, ownerActor)).not.toThrow();
    });
  });

  // ─── 3. Role-Based Access Control (RBAC) ───────────────────────────────────

  describe('Role-Based Access Control (RBAC)', () => {
    it('9. Salon Owner authorized modification of salon assets -> allowed', () => {
      const asset = createAsset();
      const ownerActor = { userId: ownerUserA, salonId: tenantASalonId, role: 'SALON_OWNER' };

      expect(authz.canModify(asset, ownerActor)).toBe(true);
      expect(() => authz.assertCanModify(asset, ownerActor)).not.toThrow();
    });

    it('10. Staff permission: cannot modify other staff files in salon if not uploader', () => {
      const asset = createAsset({ uploadedByUserId: 'other-staff-999' });
      const staffActor = { userId: staffUserA, salonId: tenantASalonId, role: 'SALON_STAFF' };

      expect(authz.canModify(asset, staffActor)).toBe(false);
      expect(() => authz.assertCanModify(asset, staffActor)).toThrow(ForbiddenException);
    });

    it('11. Customer unauthorized modification of salon assets -> rejected with NotFoundException (IDOR safety)', () => {
      const asset = createAsset();
      const customerActor = { userId: customerUserA, role: 'CUSTOMER' };

      expect(authz.canModify(asset, customerActor)).toBe(false);
      expect(() => authz.assertCanModify(asset, customerActor)).toThrow(NotFoundException);
    });

    it('12. Customer unauthorized deletion of salon assets -> rejected with NotFoundException (IDOR safety)', () => {
      const asset = createAsset();
      const customerActor = { userId: customerUserA, role: 'CUSTOMER' };

      expect(authz.canDelete(asset, customerActor)).toBe(false);
      expect(() => authz.assertCanDelete(asset, customerActor)).toThrow(NotFoundException);
    });

    it('13. Super Admin global access across all salons -> allowed', () => {
      const asset = createAsset();
      const adminActor = { userId: adminUser, role: 'SUPER_ADMIN' };

      expect(authz.canRead(asset, adminActor)).toBe(true);
      expect(authz.canModify(asset, adminActor)).toBe(true);
      expect(authz.canDelete(asset, adminActor)).toBe(true);
    });
  });

  // ─── 4. File Lifecycle & Status Access Rules ────────────────────────────────

  describe('Lifecycle State & Status Access Controls', () => {
    it('14. Deleted asset read denial for regular users -> throws NotFoundException', () => {
      const asset = createAsset({ deletedAt: new Date(), status: FileStatus.DELETED });
      const actor = { userId: staffUserA, salonId: tenantASalonId, role: 'SALON_STAFF' };

      expect(authz.canRead(asset, actor)).toBe(false);
      expect(() => authz.assertCanRead(asset, actor)).toThrow(NotFoundException);
    });

    it('15. Super Admin can read deleted asset', () => {
      const asset = createAsset({ deletedAt: new Date(), status: FileStatus.DELETED });
      const adminActor = { userId: adminUser, role: 'SUPER_ADMIN' };

      expect(authz.canRead(asset, adminActor)).toBe(true);
    });

    it('16. Download of UPLOADING status file -> throws BadRequestException', () => {
      const asset = createAsset({ status: FileStatus.UPLOADING });
      const actor = { userId: staffUserA, salonId: tenantASalonId, role: 'SALON_STAFF' };

      expect(authz.canDownload(asset, actor)).toBe(false);
      expect(() => authz.assertCanDownload(asset, actor)).toThrow(BadRequestException);
    });

    it('17. Download of PROCESSING status file -> throws BadRequestException', () => {
      const asset = createAsset({ status: FileStatus.PROCESSING });
      const actor = { userId: staffUserA, salonId: tenantASalonId, role: 'SALON_STAFF' };

      expect(authz.canDownload(asset, actor)).toBe(false);
      expect(() => authz.assertCanDownload(asset, actor)).toThrow(BadRequestException);
    });

    it('18. Download of FAILED status file -> throws BadRequestException', () => {
      const asset = createAsset({ status: FileStatus.FAILED });
      const actor = { userId: staffUserA, salonId: tenantASalonId, role: 'SALON_STAFF' };

      expect(authz.canDownload(asset, actor)).toBe(false);
      expect(() => authz.assertCanDownload(asset, actor)).toThrow(BadRequestException);
    });

    it('19. PUBLIC READY asset access -> allowed unauthenticated', () => {
      const asset = createAsset({ visibility: FileVisibility.PUBLIC, status: FileStatus.READY });
      const anonymousActor = { userId: '' };

      expect(authz.canRead(asset, anonymousActor)).toBe(true);
      expect(authz.canDownload(asset, anonymousActor)).toBe(true);
    });

    it('20. PUBLIC non-READY asset -> denied unauthenticated', () => {
      const asset = createAsset({ visibility: FileVisibility.PUBLIC, status: FileStatus.UPLOADING });
      const anonymousActor = { userId: '' };

      expect(authz.canRead(asset, anonymousActor)).toBe(false);
      expect(authz.canDownload(asset, anonymousActor)).toBe(false);
    });

    it('21. AUTHENTICATED asset -> denied unauthenticated', () => {
      const asset = createAsset({ visibility: FileVisibility.AUTHENTICATED, status: FileStatus.READY });
      const anonymousActor = { userId: '' };

      expect(authz.canRead(asset, anonymousActor)).toBe(false);
    });

    it('22. AUTHENTICATED asset -> allowed for any logged-in user', () => {
      const asset = createAsset({ visibility: FileVisibility.AUTHENTICATED, status: FileStatus.READY });
      const loggedInCustomer = { userId: customerUserA, role: 'CUSTOMER' };

      expect(authz.canRead(asset, loggedInCustomer)).toBe(true);
      expect(authz.canDownload(asset, loggedInCustomer)).toBe(true);
    });
  });

  // ─── 5. Anti-Spoofing Protections ──────────────────────────────────────────

  describe('Anti-Spoofing & Identity Boundary Enforcement', () => {
    it('23. Presigned upload: client-supplied salonId spoofing attempt is rejected', () => {
      const salonStaffActor = { userId: staffUserA, salonId: tenantASalonId, role: 'SALON_STAFF' };

      expect(() =>
        authz.resolveAuthoritativeSalonId(salonStaffActor, 'ATTACKER_SALON_EVIL'),
      ).toThrow(ForbiddenException);
    });

    it('24. Presigned upload: customer attempting to set salonId is rejected', () => {
      const customerActor = { userId: customerUserA, role: 'CUSTOMER' };

      expect(() =>
        authz.resolveAuthoritativeSalonId(customerActor, tenantASalonId),
      ).toThrow(ForbiddenException);
    });

    it('25. Presigned upload: authenticated staff salonId is authoritative', () => {
      const salonStaffActor = { userId: staffUserA, salonId: tenantASalonId, role: 'SALON_STAFF' };

      const resolved = authz.resolveAuthoritativeSalonId(salonStaffActor);
      expect(resolved).toBe(tenantASalonId);
    });

    it('26. User ID spoofing attempt is rejected', () => {
      const customerActor = { userId: customerUserA, role: 'CUSTOMER' };

      expect(() =>
        authz.resolveAuthoritativeUploaderId(customerActor, 'VICTIM_USER_999'),
      ).toThrow(ForbiddenException);
    });

    it('27. Admin can specify target salonId and target uploaderId', () => {
      const adminActor = { userId: adminUser, role: 'SUPER_ADMIN' };

      expect(authz.resolveAuthoritativeSalonId(adminActor, tenantBSalonId)).toBe(tenantBSalonId);
      expect(authz.resolveAuthoritativeUploaderId(adminActor, staffUserA)).toBe(staffUserA);
    });
  });

  // ─── 6. Security-Sensitive Visibility & Category Transitions ────────────────

  describe('Security-Sensitive Operations', () => {
    it('28. Changing PRIVATE to PUBLIC requires elevated permissions (Salon Owner -> allowed)', () => {
      const asset = createAsset({ visibility: FileVisibility.PRIVATE });
      const ownerActor = { userId: ownerUserA, salonId: tenantASalonId, role: 'SALON_OWNER' };

      expect(authz.canChangeVisibility(asset, ownerActor, FileVisibility.PUBLIC)).toBe(true);
      expect(() =>
        authz.assertCanChangeVisibility(asset, ownerActor, FileVisibility.PUBLIC),
      ).not.toThrow();
    });

    it('29. Changing PRIVATE to PUBLIC rejected for regular customer on salon asset (NotFoundException for IDOR safety)', () => {
      const asset = createAsset({ visibility: FileVisibility.PRIVATE });
      const customerActor = { userId: customerUserA, role: 'CUSTOMER' };

      expect(authz.canChangeVisibility(asset, customerActor, FileVisibility.PUBLIC)).toBe(false);
      expect(() =>
        authz.assertCanChangeVisibility(asset, customerActor, FileVisibility.PUBLIC),
      ).toThrow(NotFoundException);
    });

    it('29b. Changing AUTHENTICATED to PUBLIC rejected for customer with ForbiddenException', () => {
      const asset = createAsset({ visibility: FileVisibility.AUTHENTICATED, status: FileStatus.READY });
      const customerActor = { userId: customerUserA, role: 'CUSTOMER' };

      expect(authz.canChangeVisibility(asset, customerActor, FileVisibility.PUBLIC)).toBe(false);
      expect(() =>
        authz.assertCanChangeVisibility(asset, customerActor, FileVisibility.PUBLIC),
      ).toThrow(ForbiddenException);
    });

    it('30. Category change rejected if user lacks modification rights', () => {
      const asset = createAsset({ visibility: FileVisibility.AUTHENTICATED, status: FileStatus.READY });
      const customerActor = { userId: customerUserA, role: 'CUSTOMER' };

      expect(authz.canChangeCategory(asset, customerActor, FileCategory.MARKETING)).toBe(false);
      expect(() =>
        authz.assertCanChangeCategory(asset, customerActor, FileCategory.MARKETING),
      ).toThrow(ForbiddenException);
    });

    it('31. Metadata update rejected if asset is deleted', () => {
      const asset = createAsset({ deletedAt: new Date(), status: FileStatus.DELETED });
      const adminActor = { userId: adminUser, role: 'SUPER_ADMIN' };

      expect(authz.canModify(asset, adminActor)).toBe(false);
      expect(() => authz.assertCanModify(asset, adminActor)).toThrow(ForbiddenException);
    });
  });

  // ─── 7. Response Data Sanitization ─────────────────────────────────────────

  describe('Response Data Sanitization', () => {
    it('32. Non-admin responses strip internal bucket and provider secrets', () => {
      const asset = createAsset();
      const customerActor = { userId: customerUserA, role: 'CUSTOMER' };

      const sanitized = authz.sanitizeResponseData(asset, customerActor);

      expect((sanitized as any).bucket).toBeUndefined();
      expect((sanitized as any).provider).toBeUndefined();
      expect(sanitized.id).toBe(asset.id);
      expect(sanitized.originalFileName).toBe(asset.originalFileName);
    });

    it('33. Admin responses retain full storage details', () => {
      const asset = createAsset();
      const adminActor = { userId: adminUser, role: 'SUPER_ADMIN' };

      const sanitized = authz.sanitizeResponseData(asset, adminActor);

      expect(sanitized.bucket).toBe('saloon-assets');
      expect(sanitized.provider).toBe('R2');
    });
  });
});
