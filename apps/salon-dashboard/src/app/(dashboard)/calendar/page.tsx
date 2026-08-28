'use client';

import React from 'react';
import { MasterCalendar } from '../../../components/calendar/MasterCalendar.js';

export default function CalendarPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Master Booking Calendar</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Real-time appointment schedule, customer check-ins, stylist assignments, and status updates
        </p>
      </div>

      <MasterCalendar />
    </div>
  );
}
