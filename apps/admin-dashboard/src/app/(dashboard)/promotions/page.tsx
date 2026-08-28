'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { adminPromotionService } from '@/services/admin-domain.services';
import { formatINR } from '@saloon/shared-utils';
import { DataTable, Column } from '@/components/ui/DataTable';
import { AppBadge } from '@/components/ui/AppBadge';
import { useToast } from '@/context/ToastContext';
import { Tag, Gift, Zap, Ticket, Clock } from 'lucide-react';

export default function PromotionsPage() {
  const { danger } = useToast();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [usages, setUsages] = useState<any[]>([]);
  const [giftCards, setGiftCards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'COUPONS' | 'USAGES' | 'GIFT_CARDS'>('COUPONS');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(undefined);

  const fetchPromotions = useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'COUPONS') {
        const res = await adminPromotionService.searchCoupons({ page, limit: 10, search: search.trim() || undefined });
        setCoupons(res.data);
        setMeta(res.meta);
      } else if (activeTab === 'USAGES') {
        const res = await adminPromotionService.searchCouponUsages({ page, limit: 10 });
        setUsages(res.data);
        setMeta(res.meta);
      } else {
        const res = await adminPromotionService.searchGiftCards({ page, limit: 10 });
        setGiftCards(res.data);
        setMeta(res.meta);
      }
    } catch (err: any) {
      danger('Failed to load promotions', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, search, page, danger]);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  const couponColumns: Column<any>[] = [
    {
      key: 'code',
      header: 'Promo Code',
      render: (c) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-action-primary-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-action-primary)',
            }}
          >
            <Ticket size={18} />
          </div>
          <div>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
              {c.code}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
              {c.name || 'Promotional Offer'}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'discount',
      header: 'Discount Rule',
      render: (c) => (
        <span style={{ fontWeight: 600, color: 'var(--text-accent)' }}>
          {c.discountType === 'PERCENTAGE'
            ? `${c.discountValue}% OFF`
            : formatINR(c.discountValue ?? 0)}
        </span>
      ),
    },
    {
      key: 'usage',
      header: 'Usage Count',
      render: (c) => (
        <span>
          {c.currentUsageCount ?? 0} / {c.totalUsageLimit ? c.totalUsageLimit : '∞'} used
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Campaign Status',
      render: (c) => (
        <AppBadge variant={c.status === 'ACTIVE' ? 'success' : 'neutral'} dot>
          {c.status || 'ACTIVE'}
        </AppBadge>
      ),
    },
  ];

  const usageColumns: Column<any>[] = [
    {
      key: 'id',
      header: 'Usage Reference',
      render: (u) => <span style={{ fontWeight: 600 }}>#{u.id.substring(0, 8)}</span>,
    },
    {
      key: 'discountAmount',
      header: 'Discount Availed',
      render: (u) => (
        <span style={{ fontWeight: 600, color: 'var(--text-accent)' }}>
          {formatINR(u.discountAmount ?? 0)}
        </span>
      ),
    },
    {
      key: 'appliedAt',
      header: 'Redemption Timestamp',
      render: (u) => (
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          {new Date(u.appliedAt || u.createdAt).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </span>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Promotions & Marketing Audit</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Inspect cross-salon coupon campaigns, redemption ledgers, and gift card liabilities
        </p>
      </div>

      <DataTable
        columns={activeTab === 'COUPONS' ? couponColumns : usageColumns}
        data={activeTab === 'COUPONS' ? coupons : activeTab === 'USAGES' ? usages : giftCards}
        isLoading={isLoading}
        meta={meta}
        onPageChange={(newPage) => setPage(newPage)}
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder="Search coupon by code or campaign..."
        filterSlot={
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            <button
              onClick={() => {
                setActiveTab('COUPONS');
                setPage(1);
              }}
              style={{
                padding: '0.375rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: '1px solid',
                borderColor: activeTab === 'COUPONS' ? 'var(--primary)' : 'var(--border-subtle)',
                backgroundColor: activeTab === 'COUPONS' ? 'var(--primary-light)' : 'transparent',
                color: activeTab === 'COUPONS' ? 'var(--text-accent)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Coupons & Codes
            </button>
            <button
              onClick={() => {
                setActiveTab('USAGES');
                setPage(1);
              }}
              style={{
                padding: '0.375rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: '1px solid',
                borderColor: activeTab === 'USAGES' ? 'var(--primary)' : 'var(--border-subtle)',
                backgroundColor: activeTab === 'USAGES' ? 'var(--primary-light)' : 'transparent',
                color: activeTab === 'USAGES' ? 'var(--text-accent)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Redemption Audit Trail
            </button>
          </div>
        }
      />
    </div>
  );
}
