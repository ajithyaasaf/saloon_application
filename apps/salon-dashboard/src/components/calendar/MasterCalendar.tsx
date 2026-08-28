'use client';

import React, { useEffect, useState } from 'react';
import { BookingDto, BookingStatus } from '@saloon/shared-types';
import { formatDateToISTString, formatDuration, formatINR } from '@saloon/shared-utils';
import { Calendar as CalendarIcon, CheckCircle2, ChevronLeft, ChevronRight, Clock, Plus, Play, UserCheck, XCircle } from 'lucide-react';
import { bookingService } from '../../services/salon-domain.services.js';
import { useSalon } from '../../context/SalonContext.js';
import { Badge } from '../ui/Badge.js';
import { Button } from '../ui/Button.js';
import { Card } from '../ui/Card.js';
import { EmptyState } from '../ui/EmptyState.js';

export const MasterCalendar: React.FC = () => {
  const { selectedBranch } = useSalon();
  const [selectedDate, setSelectedDate] = useState<string>(formatDateToISTString(new Date()));
  const [bookings, setBookings] = useState<BookingDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchBookings = async () => {
    if (!selectedBranch) return;
    setIsLoading(true);
    try {
      const data = await bookingService.getBranchBookings(selectedBranch.id, selectedDate);
      setBookings(data || []);
    } catch (err) {
      console.error('Failed to fetch calendar bookings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [selectedBranch?.id, selectedDate]);

  const handleStatusChange = async (bookingId: string, nextStatus: BookingStatus) => {
    try {
      await bookingService.updateBookingStatus(bookingId, nextStatus);
      await fetchBookings();
    } catch (err) {
      console.error('Failed to update booking status:', err);
    }
  };

  const handleDateShift = (deltaDays: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + deltaDays);
    setSelectedDate(formatDateToISTString(current));
  };

  const getStatusBadgeVariant = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.CONFIRMED:
        return 'info';
      case BookingStatus.CHECKED_IN:
        return 'primary';
      case BookingStatus.IN_PROGRESS:
        return 'warning';
      case BookingStatus.COMPLETED:
        return 'success';
      case BookingStatus.CANCELLED:
      case BookingStatus.NO_SHOW:
        return 'danger';
      default:
        return 'primary';
    }
  };

  return (
    <Card
      title="Master Appointment Timeline"
      subtitle={`Viewing schedule for ${selectedBranch?.name || 'Selected Branch'}`}
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--color-background-elevated)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.25rem',
            }}
          >
            <button
              onClick={() => handleDateShift(-1)}
              style={{ background: 'none', border: 'none', color: 'var(--color-text-primary)', cursor: 'pointer', padding: '0.25rem' }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ padding: '0 0.5rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {selectedDate}
            </span>
            <button
              onClick={() => handleDateShift(1)}
              style={{ background: 'none', border: 'none', color: 'var(--color-text-primary)', cursor: 'pointer', padding: '0.25rem' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setSelectedDate(formatDateToISTString(new Date()))}>
            Today
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Loading daily queue...
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState
          title="No Appointments Scheduled"
          description={`There are no bookings scheduled for ${selectedDate}. You can record a walk-in appointment anytime.`}
          icon={<CalendarIcon size={24} />}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {bookings.map((booking) => (
            <div
              key={booking.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.25rem',
                background: 'var(--color-background-surface)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: 'var(--radius-md)',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Left Column: Time & Client */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.5rem 0.875rem',
                    background: 'var(--color-action-primary-subtle)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-action-primary)',
                  }}
                >
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {booking.startTime}
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                    {booking.endTime}
                  </span>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {booking.customerName || 'Walk-in Client'}
                    </h4>
                    <Badge variant={getStatusBadgeVariant(booking.status)}>
                      {booking.status}
                    </Badge>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                    {booking.services?.map((s) => s.serviceName).join(', ') || 'General Salon Service'}
                  </p>
                  {booking.customerPhone && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      📞 {booking.customerPhone}
                    </span>
                  )}
                </div>
              </div>

              {/* Right Column: Amount & Transition Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {formatINR(booking.totalAmount)}
                  </span>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                    {booking.paymentType}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {booking.status === BookingStatus.CONFIRMED && (
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<UserCheck size={14} />}
                      onClick={() => handleStatusChange(booking.id, BookingStatus.CHECKED_IN)}
                    >
                      Check In
                    </Button>
                  )}

                  {booking.status === BookingStatus.CHECKED_IN && (
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Play size={14} />}
                      onClick={() => handleStatusChange(booking.id, BookingStatus.IN_PROGRESS)}
                    >
                      Start Service
                    </Button>
                  )}

                  {booking.status === BookingStatus.IN_PROGRESS && (
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<CheckCircle2 size={14} />}
                      onClick={() => handleStatusChange(booking.id, BookingStatus.COMPLETED)}
                    >
                      Complete
                    </Button>
                  )}

                  {(booking.status === BookingStatus.CONFIRMED ||
                    booking.status === BookingStatus.CHECKED_IN) && (
                    <Button
                      variant="danger"
                      size="sm"
                      leftIcon={<XCircle size={14} />}
                      onClick={() => handleStatusChange(booking.id, BookingStatus.CANCELLED)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
