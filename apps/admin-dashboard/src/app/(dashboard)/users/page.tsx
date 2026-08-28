'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { adminUserService } from '@/services/admin-domain.services';
import { UserProfileDto, UserRole } from '@saloon/shared-types';
import { useAuth } from '@/context/AuthContext';
import { DataTable, Column } from '@/components/ui/DataTable';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { AppSelect } from '@/components/ui/AppSelect';
import { ActionModal } from '@/components/ui/ActionModal';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { Drawer } from '@/components/ui/Drawer';
import { useToast } from '@/context/ToastContext';
import { User, Shield, UserX, UserCheck, Edit, Mail, Phone, Calendar } from 'lucide-react';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { success, danger, warning } = useToast();

  const [users, setUsers] = useState<UserProfileDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(undefined);

  const [selectedUser, setSelectedUser] = useState<UserProfileDto | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [editingUser, setEditingUser] = useState<UserProfileDto | null>(null);
  const [newRole, setNewRole] = useState<UserRole>(UserRole.CUSTOMER);
  const [suspendingUser, setSuspendingUser] = useState<UserProfileDto | null>(null);
  const [restoringUser, setRestoringUser] = useState<UserProfileDto | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await adminUserService.listUsers({
        role: roleFilter === 'ALL' ? undefined : (roleFilter as UserRole),
        search: search.trim() || undefined,
        page,
        limit: 10,
      });
      setUsers(res.users ?? []);
      setMeta({
        total: res.total,
        page: res.page,
        limit: res.limit,
        totalPages: res.totalPages,
        hasNextPage: res.page < res.totalPages,
        hasPreviousPage: res.page > 1,
      });
    } catch (err: any) {
      danger('Failed to load users', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [roleFilter, search, page, danger]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleUpdateRole = async () => {
    if (!editingUser) return;
    if (editingUser.id === currentUser?.id && newRole !== UserRole.SUPER_ADMIN) {
      warning('Action Prevented', 'Self-demotion protection: You cannot revoke your own Super Admin role.');
      return;
    }

    setActionLoading(true);
    try {
      await adminUserService.updateUser(editingUser.id, { role: newRole });
      success('User Role Updated', `Role changed to ${newRole}.`);
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      danger('Update Failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!suspendingUser) return;
    if (suspendingUser.id === currentUser?.id) {
      warning('Action Prevented', 'You cannot suspend your own administrative account.');
      return;
    }

    setActionLoading(true);
    try {
      await adminUserService.suspendUser(suspendingUser.id);
      success('Account Suspended', 'User account suspended and all active sessions revoked.');
      setSuspendingUser(null);
      fetchUsers();
    } catch (err: any) {
      danger('Suspension Failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!restoringUser) return;
    setActionLoading(true);
    try {
      await adminUserService.restoreUser(restoringUser.id);
      success('Account Restored', 'User account has been reactivated.');
      setRestoringUser(null);
      fetchUsers();
    } catch (err: any) {
      danger('Restoration Failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return <AppBadge variant="purple">Super Admin</AppBadge>;
      case UserRole.SALON_OWNER:
        return <AppBadge variant="primary">Salon Owner</AppBadge>;
      case UserRole.SALON_MANAGER:
        return <AppBadge variant="info">Manager</AppBadge>;
      case UserRole.SALON_STAFF:
        return <AppBadge variant="info">Staff</AppBadge>;
      case UserRole.CUSTOMER:
      default:
        return <AppBadge variant="neutral">Customer</AppBadge>;
    }
  };

  const columns: Column<UserProfileDto>[] = [
    {
      key: 'name',
      header: 'User Identity',
      render: (u) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: u.role === UserRole.SUPER_ADMIN ? 'var(--color-action-primary)' : 'var(--color-action-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: u.role === UserRole.SUPER_ADMIN ? 'var(--color-text-inverse)' : 'var(--color-text-primary)',
              fontWeight: 600,
              fontSize: '0.8125rem',
            }}
          >
            {u.firstName ? u.firstName[0].toUpperCase() : <User size={16} />}
          </div>
          <div>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
              {u.displayName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unnamed User'}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {u.email || u.phone || 'No direct contact'}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Assigned Role',
      render: (u) => getRoleBadge(u.role),
    },
    {
      key: 'status',
      header: 'Active State',
      render: (u) => (
        <AppBadge variant={u.isActive ? 'success' : 'danger'} dot>
          {u.isActive ? 'Active' : 'Suspended'}
        </AppBadge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined Date',
      render: (u) => (
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          {new Date(u.createdAt).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Governance Controls',
      render: (u) => {
        const isSelf = u.id === currentUser?.id;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AppButton
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedUser(u);
                setIsDrawerOpen(true);
              }}
              leftIcon={<Shield size={14} />}
            >
              Profile
            </AppButton>

            <AppButton
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setEditingUser(u);
                setNewRole(u.role);
              }}
              leftIcon={<Edit size={14} />}
            >
              Role
            </AppButton>

            {u.isActive ? (
              <AppButton
                variant="danger"
                size="sm"
                disabled={isSelf}
                onClick={(e) => {
                  e.stopPropagation();
                  setSuspendingUser(u);
                }}
                leftIcon={<UserX size={14} />}
              >
                Suspend
              </AppButton>
            ) : (
              <AppButton
                variant="primary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setRestoringUser(u);
                }}
                leftIcon={<UserCheck size={14} />}
              >
                Restore
              </AppButton>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Platform Users & RBAC Governance</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Inspect user accounts across all tenant domains, manage roles, and enforce security suspensions
        </p>
      </div>

      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        meta={meta}
        onPageChange={(newPage) => setPage(newPage)}
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder="Search users by name, email, or phone..."
        filterSlot={
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {['ALL', 'SUPER_ADMIN', 'SALON_OWNER', 'SALON_MANAGER', 'SALON_STAFF', 'CUSTOMER'].map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRoleFilter(r);
                  setPage(1);
                }}
                style={{
                  padding: '0.375rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: '1px solid',
                  borderColor: roleFilter === r ? 'var(--primary)' : 'var(--border-subtle)',
                  backgroundColor: roleFilter === r ? 'var(--primary-light)' : 'transparent',
                  color: roleFilter === r ? 'var(--text-accent)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                {r.replace('_', ' ')}
              </button>
            ))}
          </div>
        }
      />

      {/* User Inspection Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={selectedUser?.displayName || selectedUser?.firstName || 'User Details'}
        subtitle={`UUID: ${selectedUser?.id ?? ''}`}
      >
        {selectedUser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Role & Access
              </span>
              <div style={{ marginTop: '0.375rem', display: 'flex', gap: '0.5rem' }}>
                {getRoleBadge(selectedUser.role)}
                <AppBadge variant={selectedUser.isActive ? 'success' : 'danger'}>
                  {selectedUser.isActive ? 'Active' : 'Suspended'}
                </AppBadge>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <Mail size={16} color="var(--text-muted)" />
                <span>{selectedUser.email || 'No email registered'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <Phone size={16} color="var(--text-muted)" />
                <span>{selectedUser.phone || 'No phone registered'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <Calendar size={16} color="var(--text-muted)" />
                <span>
                  Member since {new Date(selectedUser.createdAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}
                </span>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Role Modification Modal */}
      <ActionModal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={`Update Role for ${editingUser?.displayName || editingUser?.firstName || 'User'}`}
        subtitle="Modifying roles changes permissions across the entire platform ecosystem"
        footer={
          <>
            <AppButton variant="secondary" onClick={() => setEditingUser(null)} disabled={actionLoading}>
              Cancel
            </AppButton>
            <AppButton variant="primary" onClick={handleUpdateRole} isLoading={actionLoading}>
              Save Role Assignment
            </AppButton>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <AppSelect
            label="Platform Role"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as UserRole)}
            options={[
              { value: UserRole.CUSTOMER, label: 'CUSTOMER — Standard B2C App User' },
              { value: UserRole.SALON_STAFF, label: 'SALON_STAFF — Service Specialist / Stylist' },
              { value: UserRole.SALON_MANAGER, label: 'SALON_MANAGER — Branch Management Staff' },
              { value: UserRole.SALON_OWNER, label: 'SALON_OWNER — Salon Enterprise Operator' },
              { value: UserRole.SUPER_ADMIN, label: 'SUPER_ADMIN — Full Platform Governance' },
            ]}
          />
        </div>
      </ActionModal>

      {/* Suspend User Confirmation */}
      <ConfirmationDialog
        isOpen={!!suspendingUser}
        onClose={() => setSuspendingUser(null)}
        onConfirm={handleSuspend}
        title="Suspend Platform Account"
        message={`Are you sure you want to suspend account for ${suspendingUser?.displayName || suspendingUser?.email || 'this user'}? All active auth sessions and JWT access tokens will be immediately invalidated.`}
        confirmText="Suspend User"
        variant="danger"
        isLoading={actionLoading}
      />

      {/* Restore User Confirmation */}
      <ConfirmationDialog
        isOpen={!!restoringUser}
        onClose={() => setRestoringUser(null)}
        onConfirm={handleRestore}
        title="Restore Platform Account"
        message={`Reactivate account access for ${restoringUser?.displayName || restoringUser?.email || 'this user'}? They will be able to authenticate and book services immediately.`}
        confirmText="Restore Account"
        variant="primary"
        isLoading={actionLoading}
      />
    </div>
  );
}
