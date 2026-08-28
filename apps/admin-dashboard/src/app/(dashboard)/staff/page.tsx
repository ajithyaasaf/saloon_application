'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { adminUserService } from '@/services/admin-domain.services';
import { StaffMemberDto, StaffStatus } from '@saloon/shared-types';
import { DataTable, Column } from '@/components/ui/DataTable';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { useToast } from '@/context/ToastContext';
import { UserCheck, Trash2 } from 'lucide-react';

export default function StaffPage() {
  const { success, danger } = useToast();
  const [staffMembers, setStaffMembers] = useState<StaffMemberDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [employmentStatus, setEmploymentStatus] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(undefined);

  const [isCleaningInvitations, setIsCleaningInvitations] = useState(false);

  const fetchStaff = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await adminUserService.searchStaff({
        employmentStatus: employmentStatus === 'ALL' ? undefined : employmentStatus,
        search: search.trim() || undefined,
        page,
        limit: 10,
      });
      setStaffMembers(res.data);
      setMeta(res.meta);
    } catch (err: any) {
      danger('Failed to load staff list', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [employmentStatus, search, page, danger]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleCleanupInvitations = async () => {
    setIsCleaningInvitations(true);
    try {
      const res = await adminUserService.cleanupExpiredInvitations();
      success('Invitations Cleaned', res.message || 'Expired invitation tokens removed.');
      fetchStaff();
    } catch (err: any) {
      danger('Cleanup Failed', err.message);
    } finally {
      setIsCleaningInvitations(false);
    }
  };

  const columns: Column<StaffMemberDto>[] = [
    {
      key: 'name',
      header: 'Staff Professional',
      render: (st) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-action-primary-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-action-primary)',
            }}
          >
            <UserCheck size={18} />
          </div>
          <div>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
              {st.name || 'Staff Member'}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {st.email || st.phone || `Staff ID: ${st.id.substring(0, 8)}`}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'title',
      header: 'Specialization / Title',
      render: (st) => <span>{st.title || st.role || 'Stylist'}</span>,
    },
    {
      key: 'status',
      header: 'Employment Status',
      render: (st) => (
        <AppBadge
          variant={
            st.status === StaffStatus.ACTIVE
              ? 'success'
              : st.status === StaffStatus.ON_LEAVE
              ? 'warning'
              : 'neutral'
          }
          dot
        >
          {st.status || 'ACTIVE'}
        </AppBadge>
      ),
    },
    {
      key: 'branches',
      header: 'Assigned Branches',
      render: (st) => <span>{st.assignedBranches?.length ?? 1} Branch(es)</span>,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Cross-Salon Staff Directory</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Audit service professionals, active shifts, and pending staff invitations platform-wide
          </p>
        </div>

        <AppButton
          variant="secondary"
          size="sm"
          onClick={handleCleanupInvitations}
          isLoading={isCleaningInvitations}
          leftIcon={<Trash2 size={14} />}
        >
          Expire Pending Invites
        </AppButton>
      </div>

      <DataTable
        columns={columns}
        data={staffMembers}
        isLoading={isLoading}
        meta={meta}
        onPageChange={(newPage) => setPage(newPage)}
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder="Search staff by name or email..."
        filterSlot={
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {['ALL', 'ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'].map((status) => (
              <button
                key={status}
                onClick={() => {
                  setEmploymentStatus(status);
                  setPage(1);
                }}
                style={{
                  padding: '0.375rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: '1px solid',
                  borderColor: employmentStatus === status ? 'var(--primary)' : 'var(--border-subtle)',
                  backgroundColor: employmentStatus === status ? 'var(--primary-light)' : 'transparent',
                  color: employmentStatus === status ? 'var(--text-accent)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                {status}
              </button>
            ))}
          </div>
        }
      />
    </div>
  );
}
