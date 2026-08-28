'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { adminSalonService } from '@/services/admin-domain.services';
import { SalonDto, SalonStatus } from '@saloon/shared-types';
import { DataTable, Column } from '@/components/ui/DataTable';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { Drawer } from '@/components/ui/Drawer';
import { useToast } from '@/context/ToastContext';
import { Building2, Check, X, Eye, MapPin, Phone, Mail, Calendar } from 'lucide-react';

export default function SalonsPage() {
  const { success, danger } = useToast();
  const [salons, setSalons] = useState<SalonDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(undefined);

  const [selectedSalon, setSelectedSalon] = useState<SalonDto | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [rejectingSalonId, setRejectingSalonId] = useState<string | null>(null);
  const [approvingSalonId, setApprovingSalonId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchSalons = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await adminSalonService.getSalons({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: search.trim() || undefined,
        page,
        limit: 10,
      });
      setSalons(res.data);
      setMeta(res.meta);
    } catch (err: any) {
      danger('Failed to load salons', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, search, page, danger]);

  useEffect(() => {
    fetchSalons();
  }, [fetchSalons]);

  const handleApprove = async () => {
    if (!approvingSalonId) return;
    setActionLoading(true);
    try {
      await adminSalonService.approveSalon(approvingSalonId);
      success('Salon Approved', 'The salon status has been updated to APPROVED.');
      setApprovingSalonId(null);
      fetchSalons();
    } catch (err: any) {
      danger('Approval Failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (reason?: string) => {
    if (!rejectingSalonId || !reason) return;
    setActionLoading(true);
    try {
      await adminSalonService.rejectSalon(rejectingSalonId, reason);
      success('Salon Rejected', 'The salon status has been updated to REJECTED with your reason.');
      setRejectingSalonId(null);
      fetchSalons();
    } catch (err: any) {
      danger('Rejection Failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: SalonStatus) => {
    switch (status) {
      case SalonStatus.APPROVED:
        return <AppBadge variant="success" dot>Approved</AppBadge>;
      case SalonStatus.PENDING_APPROVAL:
        return <AppBadge variant="warning" dot>Pending Approval</AppBadge>;
      case SalonStatus.REJECTED:
        return <AppBadge variant="danger" dot>Rejected</AppBadge>;
      case SalonStatus.SUSPENDED:
        return <AppBadge variant="neutral" dot>Suspended</AppBadge>;
      case SalonStatus.DRAFT:
      default:
        return <AppBadge variant="neutral">Draft</AppBadge>;
    }
  };

  const columns: Column<SalonDto>[] = [
    {
      key: 'name',
      header: 'Salon Brand',
      render: (s) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-action-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-action-primary)',
            }}
          >
            <Building2 size={18} />
          </div>
          <div>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
              {(s as any).name || (s as any).brandName || 'Glamour Luxe Salon'}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Slug: {s.slug}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Verification Status',
      render: (s) => getStatusBadge(s.status),
    },
    {
      key: 'branches',
      header: 'Branches',
      render: (s) => <span>{s.branchesCount ?? 1} Branch(es)</span>,
    },
    {
      key: 'createdAt',
      header: 'Registered Date',
      render: (s) => (
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          {new Date(s.createdAt).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Administrative Actions',
      render: (s) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AppButton
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedSalon(s);
              setIsDrawerOpen(true);
            }}
            leftIcon={<Eye size={14} />}
          >
            Inspect
          </AppButton>

          {s.status === SalonStatus.PENDING_APPROVAL && (
            <>
              <AppButton
                variant="primary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setApprovingSalonId(s.id);
                }}
                leftIcon={<Check size={14} />}
              >
                Approve
              </AppButton>

              <AppButton
                variant="danger"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setRejectingSalonId(s.id);
                }}
                leftIcon={<X size={14} />}
              >
                Reject
              </AppButton>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Salon Governance & Verification</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Audit salon brand onboarding applications, manage approvals, and inspect multi-branch tenants
        </p>
      </div>

      <DataTable
        columns={columns}
        data={salons}
        isLoading={isLoading}
        meta={meta}
        onPageChange={(newPage) => setPage(newPage)}
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder="Search salon by brand name or slug..."
        filterSlot={
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {['ALL', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUSPENDED'].map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                style={{
                  padding: '0.375rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: '1px solid',
                  borderColor: statusFilter === st ? 'var(--primary)' : 'var(--border-subtle)',
                  backgroundColor: statusFilter === st ? 'var(--primary-light)' : 'transparent',
                  color: statusFilter === st ? 'var(--text-accent)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        }
      />

      {/* Salon Inspection Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={selectedSalon?.name ?? 'Salon Details'}
        subtitle={`ID: ${selectedSalon?.id ?? ''}`}
      >
        {selectedSalon && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Verification State
              </span>
              <div style={{ marginTop: '0.375rem' }}>{getStatusBadge(selectedSalon.status)}</div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Description / Bio
              </span>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.5 }}>
                {selectedSalon.description || 'No description provided by owner.'}
              </p>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Brand & Branch Network
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                <div className="glass-panel" style={{ padding: '0.875rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Total Active Branches</span>
                    <AppBadge variant="info">
                      {selectedSalon.branchesCount ?? 1} Branch(es)
                    </AppBadge>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <MapPin size={12} />
                    <span>Contact: {selectedSalon.contactPhone || selectedSalon.contactEmail || 'Registered Owner'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Approval Confirmation */}
      <ConfirmationDialog
        isOpen={!!approvingSalonId}
        onClose={() => setApprovingSalonId(null)}
        onConfirm={handleApprove}
        title="Approve Salon Application"
        message="Are you sure you want to approve this salon? It will immediately become active and public on the consumer app and customer discovery catalog."
        confirmText="Approve Salon"
        variant="primary"
        isLoading={actionLoading}
      />

      {/* Rejection Confirmation with Reason */}
      <ConfirmationDialog
        isOpen={!!rejectingSalonId}
        onClose={() => setRejectingSalonId(null)}
        onConfirm={handleReject}
        title="Reject Salon Application"
        message="Please provide a clear justification for rejecting this salon onboarding application. The reason will be recorded in the immutable audit log and transmitted to the salon owner."
        confirmText="Reject Salon"
        variant="danger"
        requireReason={true}
        reasonPlaceholder="e.g., Incomplete trade license, missing branch GST certification, or unverifiable physical address..."
        isLoading={actionLoading}
      />
    </div>
  );
}
