'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { adminCustomerService } from '@/services/admin-domain.services';
import { CustomerProfileDto, CustomerTier } from '@saloon/shared-types';
import { formatINR } from '@saloon/shared-utils';
import { DataTable, Column } from '@/components/ui/DataTable';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { Drawer } from '@/components/ui/Drawer';
import { useToast } from '@/context/ToastContext';
import { HeartHandshake, Award, Wallet, Calendar, Mail, Phone, Eye } from 'lucide-react';

export default function CustomersPage() {
  const { danger } = useToast();
  const [customers, setCustomers] = useState<CustomerProfileDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'BLOCKED' | 'ARCHIVED'>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(undefined);

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfileDto | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      let res;
      if (activeTab === 'BLOCKED') {
        res = await adminCustomerService.getBlockedCustomers({ page, limit: 10, search: search.trim() || undefined });
      } else if (activeTab === 'ARCHIVED') {
        res = await adminCustomerService.getArchivedCustomers({ page, limit: 10, search: search.trim() || undefined });
      } else {
        res = await adminCustomerService.searchCustomers({ page, limit: 10, search: search.trim() || undefined });
      }
      setCustomers(res.data);
      setMeta(res.meta);
    } catch (err: any) {
      danger('Failed to load customers', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, search, page, danger]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const getTierBadge = (tier: CustomerTier) => {
    switch (tier) {
      case CustomerTier.VIP:
      case CustomerTier.PLATINUM:
        return <AppBadge variant="purple">VIP</AppBadge>;
      case CustomerTier.GOLD:
        return <AppBadge variant="warning">Gold</AppBadge>;
      case CustomerTier.SILVER:
        return <AppBadge variant="info">Silver</AppBadge>;
      case CustomerTier.REGULAR:
      default:
        return <AppBadge variant="neutral">Regular</AppBadge>;
    }
  };

  const columns: Column<CustomerProfileDto>[] = [
    {
      key: 'name',
      header: 'Customer',
      render: (c) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-action-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-inverse)',
              fontWeight: 600,
              fontSize: '0.8125rem',
            }}
          >
            {c.name ? c.name[0].toUpperCase() : <HeartHandshake size={16} />}
          </div>
          <div>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
              {c.name || 'Customer'}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {c.phone || c.email || `ID: ${c.id.substring(0, 8)}`}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'tier',
      header: 'Loyalty Tier',
      render: (c) => getTierBadge(c.tier),
    },
    {
      key: 'loyaltyPointsBalance',
      header: 'VIP Points',
      render: (c) => (
        <span style={{ fontWeight: 600, color: 'var(--text-accent)' }}>
          {(c.loyaltyPointsBalance ?? 0).toLocaleString()} pts
        </span>
      ),
    },
    {
      key: 'walletBalance',
      header: 'Wallet Balance',
      render: (c) => (
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
          {formatINR(c.walletBalance ?? 0)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Inspection',
      render: (c) => (
        <AppButton
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedCustomer(c);
            setIsDrawerOpen(true);
          }}
          leftIcon={<Eye size={14} />}
        >
          View Profile
        </AppButton>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Customer CRM & Loyalty Oversight</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Platform-wide customer audience directory, loyalty tier allocations, and blacklist management
        </p>
      </div>

      <DataTable
        columns={columns}
        data={customers}
        isLoading={isLoading}
        meta={meta}
        onPageChange={(newPage) => setPage(newPage)}
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder="Search customer by name, phone, or email..."
        filterSlot={
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            <button
              onClick={() => {
                setActiveTab('ALL');
                setPage(1);
              }}
              style={{
                padding: '0.375rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: '1px solid',
                borderColor: activeTab === 'ALL' ? 'var(--primary)' : 'var(--border-subtle)',
                backgroundColor: activeTab === 'ALL' ? 'var(--primary-light)' : 'transparent',
                color: activeTab === 'ALL' ? 'var(--text-accent)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              All Active CRM
            </button>
            <button
              onClick={() => {
                setActiveTab('BLOCKED');
                setPage(1);
              }}
              style={{
                padding: '0.375rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: '1px solid',
                borderColor: activeTab === 'BLOCKED' ? 'var(--color-status-error)' : 'var(--color-border-subtle)',
                backgroundColor: activeTab === 'BLOCKED' ? 'var(--color-status-error-subtle)' : 'transparent',
                color: activeTab === 'BLOCKED' ? 'var(--color-status-error)' : 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}
            >
              Blocked / Blacklisted
            </button>
            <button
              onClick={() => {
                setActiveTab('ARCHIVED');
                setPage(1);
              }}
              style={{
                padding: '0.375rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: '1px solid',
                borderColor: activeTab === 'ARCHIVED' ? 'var(--color-status-warning)' : 'var(--color-border-subtle)',
                backgroundColor: activeTab === 'ARCHIVED' ? 'var(--color-status-warning-subtle)' : 'transparent',
                color: activeTab === 'ARCHIVED' ? 'var(--color-status-warning)' : 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}
            >
              Archived Profiles
            </button>
          </div>
        }
      />

      {/* Customer Detail Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={selectedCustomer?.name || 'Customer Profile'}
        subtitle={`ID: ${selectedCustomer?.id ?? ''}`}
      >
        {selectedCustomer && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {getTierBadge(selectedCustomer.tier)}
              <AppBadge variant="success">Active</AppBadge>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <Phone size={16} color="var(--text-muted)" />
                <span>{selectedCustomer.phone || 'No phone'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <Mail size={16} color="var(--text-muted)" />
                <span>{selectedCustomer.email || 'No email'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <Award size={16} color="var(--text-muted)" />
                <span>{selectedCustomer.loyaltyPointsBalance ?? 0} VIP Reward Points</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <Wallet size={16} color="var(--text-muted)" />
                <span>Wallet: {formatINR(selectedCustomer.walletBalance ?? 0)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <Calendar size={16} color="var(--text-muted)" />
                <span>
                  Total Bookings: {selectedCustomer.totalBookingsCount ?? 0} ({formatINR(selectedCustomer.totalSpentAmount ?? 0)} lifetime spend)
                </span>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
