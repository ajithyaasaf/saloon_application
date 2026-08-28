'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { adminBookingService } from '@/services/admin-domain.services';
import { BookingDto, BookingStatus } from '@saloon/shared-types';
import { formatINR, format12HourTimeRange } from '@saloon/shared-utils';
import { DataTable, Column } from '@/components/ui/DataTable';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { Drawer } from '@/components/ui/Drawer';
import { useToast } from '@/context/ToastContext';
import { Calendar, Eye, Zap, Clock, Building2 } from 'lucide-react';

export default function BookingsPage() {
  const { success, danger } = useToast();
  const [bookings, setBookings] = useState<BookingDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(undefined);

  const [selectedBooking, setSelectedBooking] = useState<BookingDto | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCleaningLocks, setIsCleaningLocks] = useState(false);

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await adminBookingService.searchBookings({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: search.trim() || undefined,
        page,
        limit: 10,
      });
      setBookings(res.data);
      setMeta(res.meta);
    } catch (err: any) {
      danger('Failed to load bookings', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, search, page, danger]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleCleanupLocks = async () => {
    setIsCleaningLocks(true);
    try {
      const res = await adminBookingService.cleanupExpiredLocks();
      success('Locks Cleaned', `Released ${res.cleanedCount ?? 0} expired reservation locks.`);
    } catch (err: any) {
      danger('Cleanup Failed', err.message);
    } finally {
      setIsCleaningLocks(false);
    }
  };

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.COMPLETED:
        return <AppBadge variant="success" dot>Completed</AppBadge>;
      case BookingStatus.CONFIRMED:
        return <AppBadge variant="info" dot>Confirmed</AppBadge>;
      case BookingStatus.IN_PROGRESS:
        return <AppBadge variant="purple" dot>In Progress</AppBadge>;
      case BookingStatus.CANCELLED:
        return <AppBadge variant="danger" dot>Cancelled</AppBadge>;
      case BookingStatus.PENDING:
        return <AppBadge variant="warning" dot>Pending</AppBadge>;
      default:
        return <AppBadge variant="neutral">{status}</AppBadge>;
    }
  };

  const columns: Column<BookingDto>[] = [
    {
      key: 'bookingNumber',
      header: 'Booking Ref',
      render: (b) => (
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
          #{b.bookingNumber || b.id.substring(0, 8)}
        </span>
      ),
    },
    {
      key: 'salonName',
      header: 'Salon / Branch',
      render: (b) => (
        <div>
          <span style={{ fontWeight: 600, display: 'block' }}>{b.salonName || 'Salon'}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {b.branchName || 'Main Branch'}
          </span>
        </div>
      ),
    },
    {
      key: 'bookingDate',
      header: 'Appointment Time',
      render: (b) => (
        <div>
          <span style={{ fontWeight: 500, display: 'block' }}>
            {b.bookingDate}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {format12HourTimeRange(b.startTime, b.endTime)}
          </span>
        </div>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Total Price',
      render: (b) => (
        <span style={{ fontWeight: 600, color: 'var(--text-accent)' }}>
          {formatINR(b.totalAmount ?? 0)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (b) => getStatusBadge(b.status),
    },
    {
      key: 'actions',
      header: 'Audit',
      render: (b) => (
        <AppButton
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedBooking(b);
            setIsDrawerOpen(true);
          }}
          leftIcon={<Eye size={14} />}
        >
          Inspect
        </AppButton>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Global Bookings Ledger</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Cross-tenant appointment transactions, schedule tracking, and reservation lock governance
          </p>
        </div>

        <AppButton
          variant="secondary"
          size="sm"
          onClick={handleCleanupLocks}
          isLoading={isCleaningLocks}
          leftIcon={<Zap size={14} />}
        >
          Clean Expired Locks
        </AppButton>
      </div>

      <DataTable
        columns={columns}
        data={bookings}
        isLoading={isLoading}
        meta={meta}
        onPageChange={(newPage) => setPage(newPage)}
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder="Search bookings by reference, salon, or customer..."
        filterSlot={
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {['ALL', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'PENDING'].map((st) => (
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
                }}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        }
      />

      {/* Booking Detail Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={`Booking #${selectedBooking?.bookingNumber || selectedBooking?.id?.substring(0, 8) || ''}`}
        subtitle={`Scheduled on ${selectedBooking?.bookingDate ?? ''}`}
      >
        {selectedBooking && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Booking Status
                </span>
                <div style={{ marginTop: '0.25rem' }}>{getStatusBadge(selectedBooking.status)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Total Billed
                </span>
                <h3 style={{ color: 'var(--text-accent)', fontSize: '1.25rem', fontWeight: 700 }}>
                  {formatINR(selectedBooking.totalAmount ?? 0)}
                </h3>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <Building2 size={16} color="var(--primary)" />
                <span>
                  {selectedBooking.salonName} — {selectedBooking.branchName}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <Clock size={16} color="var(--primary)" />
                <span>
                  {format12HourTimeRange(selectedBooking.startTime, selectedBooking.endTime)}
                </span>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
