'use client';

import React, { useState } from 'react';
import { BranchDto, ClosureType, DayOfWeek } from '@saloon/shared-types';
import { Clock, MapPin, Plus, Store } from 'lucide-react';
import { useSalon } from '../../../context/SalonContext.js';
import { salonService } from '../../../services/salon-domain.services.js';
import { Card } from '../../../components/ui/Card.js';
import { Button } from '../../../components/ui/Button.js';
import { Badge } from '../../../components/ui/Badge.js';
import { Modal } from '../../../components/ui/Modal.js';
import { Input } from '../../../components/ui/Input.js';
import { TimePicker } from '../../../components/ui/TimePicker.js';
import { format12HourTime, format12HourTimeRange } from '@saloon/shared-utils';

const DAYS_OF_WEEK: DayOfWeek[] = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
  DayOfWeek.SUNDAY,
];

export default function BranchesPage() {
  const { salon, branches, selectedBranch, refreshSalonData } = useSalon();
  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false);
  const [isHoursModalOpen, setIsHoursModalOpen] = useState(false);
  const [isClosureModalOpen, setIsClosureModalOpen] = useState(false);

  // New Branch Form
  const [branchName, setBranchName] = useState('');
  const [branchCity, setBranchCity] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchPhone, setBranchPhone] = useState('');

  // Closure Form
  const [closureStartDate, setClosureStartDate] = useState('');
  const [closureEndDate, setClosureEndDate] = useState('');
  const [closureReason, setClosureReason] = useState('');

  // Hours Form
  const [openTime, setOpenTime] = useState('09:00');
  const [closeTime, setCloseTime] = useState('20:00');
  const [lunchStart, setLunchStart] = useState('13:00');
  const [lunchEnd, setLunchEnd] = useState('14:00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salon) return;
    setIsSubmitting(true);
    try {
      await salonService.createBranch(salon.id, {
        name: branchName,
        city: branchCity,
        state: 'Karnataka',
        postalCode: '560001',
        addressLine1: branchAddress,
        phone: branchPhone,
        latitude: 12.9716,
        longitude: 77.5946,
      });
      setIsAddBranchOpen(false);
      setBranchName('');
      setBranchCity('');
      setBranchAddress('');
      setBranchPhone('');
      await refreshSalonData();
    } catch (err) {
      console.error('Failed to create branch:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveOperatingHours = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salon || !selectedBranch) return;
    setIsSubmitting(true);
    try {
      const hours = DAYS_OF_WEEK.map((day) => ({
        dayOfWeek: day,
        openTime: openTime,
        closeTime: closeTime,
        isOpen: true,
        breakStartTime: lunchStart,
        breakEndTime: lunchEnd,
      }));
      await salonService.updateOperatingHours(salon.id, selectedBranch.id, hours);
      setIsHoursModalOpen(false);
      await refreshSalonData();
    } catch (err) {
      console.error('Failed to update operating hours:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddClosure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salon || !selectedBranch) return;
    setIsSubmitting(true);
    try {
      await salonService.createClosure(salon.id, selectedBranch.id, {
        startDate: closureStartDate,
        endDate: closureEndDate,
        reason: closureReason,
        closureType: ClosureType.HOLIDAY,
      });
      setIsClosureModalOpen(false);
      setClosureStartDate('');
      setClosureEndDate('');
      setClosureReason('');
      await refreshSalonData();
    } catch (err) {
      console.error('Failed to add closure:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Branches & Operational Hours</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Manage physical branch locations, weekly business hours, and holiday schedules
          </p>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setIsAddBranchOpen(true)}>
          Add New Branch
        </Button>
      </div>

      {/* Branches Grid */}
      <div className="grid-cols-3">
        {branches.map((b) => (
          <Card
            key={b.id}
            title={b.name}
            subtitle={`${b.city}, ${b.state}`}
            actions={<Badge variant={b.status === 'ACTIVE' ? 'success' : 'warning'}>{b.status}</Badge>}
          >
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              <p style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                <MapPin size={14} /> {b.addressLine1}
              </p>
              {b.phone && <p>📞 {b.phone}</p>}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
              <Button variant="secondary" size="sm" leftIcon={<Clock size={14} />} onClick={() => setIsHoursModalOpen(true)}>
                Hours
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setIsClosureModalOpen(true)}>
                Special Closures
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Weekly Operating Hours Card */}
      <Card
        title={`Weekly Business Hours: ${selectedBranch?.name || 'Selected Branch'}`}
        subtitle="Standard opening and closing hours for customer slot availability"
        actions={
          <Button variant="secondary" size="sm" leftIcon={<Clock size={14} />} onClick={() => setIsHoursModalOpen(true)}>
            Edit Schedule
          </Button>
        }
      >
        <div className="data-table-wrapper" style={{ marginTop: '0.5rem' }}>
          <div className="data-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>Day of Week</th>
                  <th style={{ width: '15%' }}>Branch Status</th>
                  <th style={{ width: '20%' }}>Opening Time</th>
                  <th style={{ width: '20%' }}>Closing Time</th>
                  <th style={{ width: '20%' }}>Daily Lunch Break</th>
                </tr>
              </thead>
              <tbody>
                {DAYS_OF_WEEK.map((day) => (
                  <tr key={day}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{day}</span>
                      </div>
                    </td>
                    <td>
                      <Badge variant={day === DayOfWeek.SUNDAY ? 'warning' : 'success'}>
                        {day === DayOfWeek.SUNDAY ? 'Limited Hours' : 'Open Standard'}
                      </Badge>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {format12HourTime(openTime)}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {format12HourTime(closeTime)}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                          padding: '0.25rem 0.625rem',
                          background: 'var(--color-action-secondary)',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        <Clock size={12} /> {format12HourTimeRange(lunchStart, lunchEnd)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Operating Hours Modal */}
      <Modal isOpen={isHoursModalOpen} onClose={() => setIsHoursModalOpen(false)} title={`Configure Operating Hours: ${selectedBranch?.name || ''}`}>
        <form onSubmit={handleSaveOperatingHours}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
            Set the standard salon operational opening/closing times and midday staff lunch break.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <TimePicker label="Opening Time" required value={openTime} onChange={setOpenTime} align="left" />
            <TimePicker label="Closing Time" required value={closeTime} onChange={setCloseTime} align="right" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
            <TimePicker label="Lunch Break Start" required value={lunchStart} onChange={setLunchStart} align="left" />
            <TimePicker label="Lunch Break End" required value={lunchEnd} onChange={setLunchEnd} align="right" />
          </div>

          <div
            style={{
              marginTop: '1.25rem',
              padding: '0.75rem 1rem',
              background: 'var(--color-action-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.8125rem',
            }}
          >
            <span style={{ color: 'var(--color-text-secondary)' }}>Selected Active Window:</span>
            <span style={{ fontWeight: 700, color: 'var(--color-action-primary)' }}>
              {format12HourTime(openTime)} – {format12HourTime(closeTime)}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button variant="secondary" type="button" onClick={() => setIsHoursModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Hours'}</Button>
          </div>
        </form>
      </Modal>

      {/* Add Branch Modal */}
      <Modal isOpen={isAddBranchOpen} onClose={() => setIsAddBranchOpen(false)} title="Register New Branch Location">
        <form onSubmit={handleCreateBranch}>
          <Input label="Branch Name" required value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder="e.g. Indiranagar Flagship" />
          <Input label="City" required value={branchCity} onChange={(e) => setBranchCity(e.target.value)} placeholder="e.g. Bengaluru" />
          <Input label="Address Line" required value={branchAddress} onChange={(e) => setBranchAddress(e.target.value)} placeholder="100ft Road, HAL 2nd Stage" />
          <Input label="Contact Phone" value={branchPhone} onChange={(e) => setBranchPhone(e.target.value)} placeholder="+91 9876543210" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button variant="secondary" type="button" onClick={() => setIsAddBranchOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Branch'}</Button>
          </div>
        </form>
      </Modal>

      {/* Special Closure Modal */}
      <Modal isOpen={isClosureModalOpen} onClose={() => setIsClosureModalOpen(false)} title="Schedule Holiday or Emergency Closure">
        <form onSubmit={handleAddClosure}>
          <Input label="Start Date" type="date" required value={closureStartDate} onChange={(e) => setClosureStartDate(e.target.value)} />
          <Input label="End Date" type="date" required value={closureEndDate} onChange={(e) => setClosureEndDate(e.target.value)} />
          <Input label="Closure Reason" required value={closureReason} onChange={(e) => setClosureReason(e.target.value)} placeholder="e.g. Diwali Holiday or Annual Maintenance" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button variant="secondary" type="button" onClick={() => setIsClosureModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Adding...' : 'Add Closure'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
