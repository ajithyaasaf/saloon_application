'use client';

import React, { useEffect, useState } from 'react';
import { DayOfWeek, StaffLeaveDto, StaffMemberDto, UserRole } from '@saloon/shared-types';
import { Calendar, Check, Clock, Plus, UserPlus, Users, X } from 'lucide-react';
import { useSalon } from '../../../context/SalonContext.js';
import { staffService } from '../../../services/salon-domain.services.js';
import { Card } from '../../../components/ui/Card.js';
import { Button } from '../../../components/ui/Button.js';
import { Badge } from '../../../components/ui/Badge.js';
import { Modal } from '../../../components/ui/Modal.js';
import { Input } from '../../../components/ui/Input.js';
import { Select } from '../../../components/ui/Select.js';

export default function StaffPage() {
  const { salon, selectedBranch } = useSalon();
  const [staffList, setStaffList] = useState<StaffMemberDto[]>([]);
  const [leaves, setLeaves] = useState<StaffLeaveDto[]>([]);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMemberDto | null>(null);

  // New Staff Form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('Senior Hair Stylist');
  const [commissionRate, setCommissionRate] = useState(15);

  // Shift Form
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('18:00');
  const [breakStart, setBreakStart] = useState('13:00');
  const [breakEnd, setBreakEnd] = useState('14:00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadStaffData = async () => {
    try {
      const data = await staffService.getStaffMembers(salon?.id);
      setStaffList(data || []);
    } catch (err) {
      console.error('Failed to load staff members:', err);
    }
  };

  useEffect(() => {
    loadStaffData();
  }, [salon?.id]);

  const handleOpenShifts = (stf: StaffMemberDto) => {
    setSelectedStaff(stf);
    setIsShiftModalOpen(true);
  };

  const handleOpenLeaves = async (stf: StaffMemberDto) => {
    setSelectedStaff(stf);
    try {
      const staffLeaves = await staffService.getLeaves(stf.id);
      setLeaves(staffLeaves || []);
    } catch {
      setLeaves([]);
    }
    setIsLeaveModalOpen(true);
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;
    setIsSubmitting(true);
    try {
      await staffService.createStaff({
        firstName,
        lastName,
        phone,
        email,
        title,
        commissionRate: Number(commissionRate),
        primaryBranchId: selectedBranch.id,
      });
      setIsAddStaffOpen(false);
      setFirstName('');
      setLastName('');
      setPhone('');
      setEmail('');
      await loadStaffData();
    } catch (err) {
      console.error('Failed to create staff member:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveShifts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff || !selectedBranch) return;
    setIsSubmitting(true);
    try {
      const shifts = [
        DayOfWeek.MONDAY,
        DayOfWeek.TUESDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.THURSDAY,
        DayOfWeek.FRIDAY,
        DayOfWeek.SATURDAY,
      ].map((dayOfWeek) => ({
        dayOfWeek,
        startTime: shiftStart,
        endTime: shiftEnd,
        isWorkingDay: true,
        breakStartTime: breakStart,
        breakEndTime: breakEnd,
      }));

      await staffService.configureShifts(selectedStaff.id, {
        shifts,
      });
      setIsShiftModalOpen(false);
      setSelectedStaff(null);
      await loadStaffData();
    } catch (err) {
      console.error('Failed to save shifts:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Staff Roster & Working Shifts</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Manage stylist profiles, shift hours, lunch breaks, and leave requests
          </p>
        </div>
        <Button variant="primary" leftIcon={<UserPlus size={16} />} onClick={() => setIsAddStaffOpen(true)}>
          Add Team Member
        </Button>
      </div>

      {/* Staff Directory Cards Grid */}
      <div className="grid-cols-3">
        {staffList.length === 0 ? (
          <div style={{ gridColumn: '1 / -1' }}>
            <Card title="Team Directory">
              <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No staff members registered yet. Click "Add Team Member" above.
              </p>
            </Card>
          </div>
        ) : (
          staffList.map((stf) => (
            <Card
              key={stf.id}
              title={stf.name}
              subtitle={stf.title || 'Stylist'}
              actions={<Badge variant={stf.status === 'ACTIVE' ? 'success' : 'warning'}>{stf.status}</Badge>}
            >
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                <p>📞 {stf.phone || 'No phone'}</p>
                {stf.email && <p>✉️ {stf.email}</p>}
                <p style={{ marginTop: '0.25rem', color: 'var(--text-accent)' }}>
                  Commission: {stf.commissionRate || 10}%
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                <Button variant="secondary" size="sm" leftIcon={<Clock size={12} />} onClick={() => handleOpenShifts(stf)}>
                  Edit Shifts
                </Button>
                <Button variant="secondary" size="sm" leftIcon={<Calendar size={12} />} onClick={() => handleOpenLeaves(stf)}>
                  View Leaves
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Add Staff Modal */}
      <Modal isOpen={isAddStaffOpen} onClose={() => setIsAddStaffOpen(false)} title="Onboard New Stylist / Staff">
        <form onSubmit={handleCreateStaff}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="First Name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Anita" />
            <Input label="Last Name" required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Sharma" />
          </div>

          <Input label="Mobile Phone" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9876543210" />
          <Input label="Email (Optional login)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="anita@glamourluxe.com" />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Job Title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Master Colorist" />
            <Input label="Commission %" type="number" required value={commissionRate} onChange={(e) => setCommissionRate(Number(e.target.value))} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button variant="secondary" type="button" onClick={() => setIsAddStaffOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Adding...' : 'Add to Team'}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Shifts Modal */}
      <Modal isOpen={isShiftModalOpen} onClose={() => setIsShiftModalOpen(false)} title={`Configure Weekly Shifts: ${selectedStaff?.name || ''}`}>
        <form onSubmit={handleSaveShifts}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Set standard working schedule and lunch break for Monday through Saturday.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Shift Start Time" type="time" required value={shiftStart} onChange={(e) => setShiftStart(e.target.value)} />
            <Input label="Shift End Time" type="time" required value={shiftEnd} onChange={(e) => setShiftEnd(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
            <Input label="Lunch Break Start" type="time" required value={breakStart} onChange={(e) => setBreakStart(e.target.value)} />
            <Input label="Lunch Break End" type="time" required value={breakEnd} onChange={(e) => setBreakEnd(e.target.value)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button variant="secondary" type="button" onClick={() => setIsShiftModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Shifts'}</Button>
          </div>
        </form>
      </Modal>

      {/* View Leaves Modal */}
      <Modal isOpen={isLeaveModalOpen} onClose={() => setIsLeaveModalOpen(false)} title={`Leaves & Time-Off: ${selectedStaff?.name || ''}`}>
        <div>
          {leaves.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
              No leave requests or scheduled time-off for this team member.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {leaves.map((lv) => (
                <div key={lv.id} style={{ padding: '0.75rem', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600 }}>{lv.startDate} to {lv.endDate}</span>
                    <Badge variant={lv.status === 'APPROVED' ? 'success' : 'warning'}>{lv.status}</Badge>
                  </div>
                  {lv.reason && <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{lv.reason}</p>}
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <Button variant="secondary" type="button" onClick={() => setIsLeaveModalOpen(false)}>Close</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
