'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { adminPaymentService } from '@/services/admin-domain.services';
import { PaymentDto, PaymentStatus, RefundDto } from '@saloon/shared-types';
import { formatINR } from '@saloon/shared-utils';
import { DataTable, Column } from '@/components/ui/DataTable';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { StatCard } from '@/components/ui/StatCard';
import { useToast } from '@/context/ToastContext';
import { CreditCard, RotateCcw, CheckCircle2, RefreshCw } from 'lucide-react';

export default function PaymentsPage() {
  const { success, danger } = useToast();
  const [payments, setPayments] = useState<PaymentDto[]>([]);
  const [refunds, setRefunds] = useState<RefundDto[]>([]);
  const [stats, setStats] = useState<{
    totalVolume: number;
    totalSuccessCount: number;
    totalFailedCount: number;
    totalRefundedAmount: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'FAILED' | 'REFUNDS'>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(undefined);

  const [retryingId, setRetryingId] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    try {
      const statsRes = await adminPaymentService.getStatistics();
      setStats(statsRes);

      if (activeTab === 'REFUNDS') {
        const res = await adminPaymentService.getRefunds();
        setRefunds(res);
      } else if (activeTab === 'FAILED') {
        const res = await adminPaymentService.getFailedPayments({ page, limit: 10 });
        setPayments(res.data);
        setMeta(res.meta);
      } else {
        const res = await adminPaymentService.searchPayments({ page, limit: 10 });
        setPayments(res.data);
        setMeta(res.meta);
      }
    } catch (err: any) {
      danger('Failed to load financial records', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, page, danger]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleRetryWebhook = async (paymentId: string) => {
    setRetryingId(paymentId);
    try {
      await adminPaymentService.retryWebhook(paymentId);
      success('Webhook Replay Initiated', 'The webhook event has been queued for re-execution.');
      fetchPayments();
    } catch (err: any) {
      danger('Webhook Retry Failed', err.message);
    } finally {
      setRetryingId(null);
    }
  };

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.PAID:
        return <AppBadge variant="success" dot>Paid</AppBadge>;
      case PaymentStatus.FAILED:
        return <AppBadge variant="danger" dot>Failed</AppBadge>;
      case PaymentStatus.REFUNDED:
        return <AppBadge variant="warning" dot>Refunded</AppBadge>;
      case PaymentStatus.UNPAID:
      default:
        return <AppBadge variant="neutral">Unpaid</AppBadge>;
    }
  };

  const paymentColumns: Column<PaymentDto>[] = [
    {
      key: 'id',
      header: 'Transaction Ref',
      render: (p) => (
        <div>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
            #{p.id.substring(0, 10)}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Method: {p.paymentMethod || 'RAZORPAY'}
          </span>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount Processed',
      render: (p) => (
        <span style={{ fontWeight: 600, color: 'var(--text-accent)' }}>
          {formatINR(p.amount ?? 0)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Settlement Status',
      render: (p) => getStatusBadge(p.status),
    },
    {
      key: 'createdAt',
      header: 'Transaction Date',
      render: (p) => (
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          {new Date(p.createdAt).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Operations',
      render: (p) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {p.status === PaymentStatus.FAILED && (
            <AppButton
              variant="outline"
              size="sm"
              onClick={() => handleRetryWebhook(p.id)}
              isLoading={retryingId === p.id}
              leftIcon={<RefreshCw size={14} />}
            >
              Retry Event
            </AppButton>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Financial Ledger & Payments Audit</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Platform transaction reconciliation, failed payment investigations, and webhook retries
        </p>
      </div>

      <div className="grid-cols-3">
        <StatCard
          title="Gross Transaction Volume"
          value={isLoading ? '...' : formatINR(stats?.totalVolume ?? 0)}
          icon={<CreditCard size={20} />}
          subtitle="Processed via Razorpay gateway"
          variant="emerald"
        />
        <StatCard
          title="Payment Success Ratio"
          value={
            isLoading
              ? '...'
              : stats && stats.totalSuccessCount + stats.totalFailedCount > 0
              ? `${((stats.totalSuccessCount / (stats.totalSuccessCount + stats.totalFailedCount)) * 100).toFixed(1)}%`
              : '100%'
          }
          icon={<CheckCircle2 size={20} />}
          subtitle="Cross-platform reliability index"
          variant="indigo"
        />
        <StatCard
          title="Global Refunds Processed"
          value={isLoading ? '...' : formatINR(stats?.totalRefundedAmount ?? 0)}
          icon={<RotateCcw size={20} />}
          subtitle="Processed to customer source accounts"
          variant="amber"
        />
      </div>

      <DataTable
        columns={paymentColumns}
        data={payments}
        isLoading={isLoading}
        meta={meta}
        onPageChange={(newPage) => setPage(newPage)}
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder="Search payment by ID or method..."
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
              All Transactions
            </button>
            <button
              onClick={() => {
                setActiveTab('FAILED');
                setPage(1);
              }}
              style={{
                padding: '0.375rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: '1px solid',
                borderColor: activeTab === 'FAILED' ? 'var(--color-status-error)' : 'var(--color-border-subtle)',
                backgroundColor: activeTab === 'FAILED' ? 'var(--color-status-error-subtle)' : 'transparent',
                color: activeTab === 'FAILED' ? 'var(--color-status-error)' : 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}
            >
              Failed Payments
            </button>
          </div>
        }
      />
    </div>
  );
}
