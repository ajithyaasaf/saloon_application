'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { adminInventoryService } from '@/services/admin-domain.services';
import { BranchProductStockDto, StockMovementDto } from '@saloon/shared-types';
import { formatINR } from '@saloon/shared-utils';
import { DataTable, Column } from '@/components/ui/DataTable';
import { AppBadge } from '@/components/ui/AppBadge';
import { StatCard } from '@/components/ui/StatCard';
import { useToast } from '@/context/ToastContext';
import { Package, FileText } from 'lucide-react';

export default function InventoryPage() {
  const { danger } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [stockList, setStockList] = useState<BranchProductStockDto[]>([]);
  const [movements, setMovements] = useState<StockMovementDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'STOCK' | 'MOVEMENTS'>('STOCK');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(undefined);

  const fetchInventory = useCallback(async () => {
    setIsLoading(true);
    try {
      const statsRes = await adminInventoryService.getStatistics();
      setStats(statsRes);

      if (activeTab === 'STOCK') {
        const res = await adminInventoryService.searchStock({ page, limit: 10, search: search.trim() || undefined });
        setStockList(res.data);
        setMeta(res.meta);
      } else {
        const res = await adminInventoryService.searchMovements({ page, limit: 10 });
        setMovements(res.data);
        setMeta(res.meta);
      }
    } catch (err: any) {
      danger('Failed to load inventory data', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, search, page, danger]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const stockColumns: Column<BranchProductStockDto>[] = [
    {
      key: 'productId',
      header: 'Product / SKU',
      render: (s) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-action-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-action-primary)',
            }}
          >
            <Package size={18} />
          </div>
          <div>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
              {s.product?.name || s.productId?.substring(0, 10) || 'Inventory SKU'}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              SKU: {s.product?.sku || 'SKU-ITEM'} • Branch: #{s.branchId?.substring(0, 8) || 'Main'}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'quantityOnHand',
      header: 'Current Stock',
      render: (s) => (
        <span style={{ fontWeight: 600, color: s.isLowStock ? 'var(--danger)' : 'var(--text-primary)' }}>
          {s.quantityOnHand ?? 0} units
        </span>
      ),
    },
    {
      key: 'reorderLevel',
      header: 'Reorder Threshold',
      render: (s) => <span>{s.reorderLevel ?? 5} units</span>,
    },
    {
      key: 'status',
      header: 'Stock Status',
      render: (s) => (
        <AppBadge variant={s.isLowStock ? 'danger' : 'success'} dot>
          {s.isLowStock ? 'Low Stock Alert' : 'Healthy Stock'}
        </AppBadge>
      ),
    },
  ];

  const movementColumns: Column<StockMovementDto>[] = [
    {
      key: 'type',
      header: 'Movement Type',
      render: (m) => (
        <AppBadge variant={m.type?.includes('IN') ? 'success' : 'warning'}>
          {m.type || 'ADJUSTMENT'}
        </AppBadge>
      ),
    },
    {
      key: 'quantity',
      header: 'Quantity Changed',
      render: (m) => (
        <span style={{ fontWeight: 600, color: 'var(--text-accent)' }}>
          {m.quantity > 0 ? `+${m.quantity}` : m.quantity} units
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Timestamp',
      render: (m) => (
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          {new Date(m.createdAt).toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            dateStyle: 'medium',
            timeStyle: 'short',
            hour12: true,
          })}
        </span>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Platform Inventory & Stock Valuation</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Cross-branch product catalog oversight, stock valuation aggregates, and audit movement ledgers
        </p>
      </div>

      <div className="grid-cols-3">
        <StatCard
          title="Platform Inventory Valuation"
          value={isLoading ? '...' : formatINR(stats?.totalInventoryValuation ?? 0)}
          icon={<Package size={20} />}
          subtitle="Estimated market retail valuation"
          variant="purple"
        />
        <StatCard
          title="Tracked Master SKUs"
          value={isLoading ? '...' : (stats?.totalTrackedSkus ?? 0).toLocaleString()}
          icon={<Package size={20} />}
          subtitle="Active products across branches"
          variant="indigo"
        />
        <StatCard
          title="Pending Purchase Orders"
          value={isLoading ? '...' : (stats?.pendingPurchaseOrders ?? 0).toLocaleString()}
          icon={<FileText size={20} />}
          subtitle="Orders awaiting supplier fulfillment"
          variant="amber"
        />
      </div>

      {activeTab === 'STOCK' ? (
        <DataTable<BranchProductStockDto>
          columns={stockColumns}
          data={stockList}
          isLoading={isLoading}
          meta={meta}
          onPageChange={(newPage) => setPage(newPage)}
          searchValue={search}
          onSearchChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          searchPlaceholder="Search inventory by SKU or product..."
          filterSlot={
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              <button
                onClick={() => {
                  setActiveTab('STOCK');
                  setPage(1);
                }}
                style={{
                  padding: '0.375rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: '1px solid',
                  borderColor: 'var(--primary)',
                  backgroundColor: 'var(--primary-light)',
                  color: 'var(--text-accent)',
                  cursor: 'pointer',
                }}
              >
                Stock Valuation & SKUs
              </button>
              <button
                onClick={() => {
                  setActiveTab('MOVEMENTS');
                  setPage(1);
                }}
                style={{
                  padding: '0.375rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: '1px solid',
                  borderColor: 'var(--border-subtle)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                Stock Movements Ledger
              </button>
            </div>
          }
        />
      ) : (
        <DataTable<StockMovementDto>
          columns={movementColumns}
          data={movements}
          isLoading={isLoading}
          meta={meta}
          onPageChange={(newPage) => setPage(newPage)}
          searchValue={search}
          onSearchChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          searchPlaceholder="Search inventory movements..."
          filterSlot={
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              <button
                onClick={() => {
                  setActiveTab('STOCK');
                  setPage(1);
                }}
                style={{
                  padding: '0.375rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: '1px solid',
                  borderColor: 'var(--border-subtle)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                Stock Valuation & SKUs
              </button>
              <button
                onClick={() => {
                  setActiveTab('MOVEMENTS');
                  setPage(1);
                }}
                style={{
                  padding: '0.375rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: '1px solid',
                  borderColor: 'var(--primary)',
                  backgroundColor: 'var(--primary-light)',
                  color: 'var(--text-accent)',
                  cursor: 'pointer',
                }}
              >
                Stock Movements Ledger
              </button>
            </div>
          }
        />
      )}
    </div>
  );
}
