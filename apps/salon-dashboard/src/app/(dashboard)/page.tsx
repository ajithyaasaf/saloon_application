'use client';

import React, { useEffect, useState } from 'react';
import { Calendar, DollarSign, Package, Scissors, Sparkles, Star, TrendingUp, Users } from 'lucide-react';
import { formatINR } from '@saloon/shared-utils';
import { useSalon } from '../../context/SalonContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { StatCard } from '../../components/ui/StatCard.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { MasterCalendar } from '../../components/calendar/MasterCalendar.js';
import Link from 'next/link';

export default function DashboardOverviewPage() {
  const { salon, selectedBranch } = useSalon();
  const { user } = useAuth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Top Banner Greeting */}
      <div
        className="glass-panel"
        style={{
          padding: '1.75rem 2rem',
          background: 'var(--card-background)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-accent)', fontWeight: 600, textTransform: 'uppercase' }}>
            Salon Partner HQ
          </span>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>
            Welcome back, {user?.firstName || 'Owner'} 👋
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {salon?.name || 'Saloon Brand'} • {selectedBranch?.name || 'Main Branch'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/calendar">
            <Button variant="primary" leftIcon={<Calendar size={16} />}>
              Open Calendar
            </Button>
          </Link>
          <Link href="/services">
            <Button variant="secondary" leftIcon={<Scissors size={16} />}>
              Service Catalog
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid-cols-4">
        <StatCard
          label="Today's Estimated GMV"
          value={formatINR(18450)}
          change="12.5% vs yesterday"
          isPositive={true}
          icon={<DollarSign size={20} />}
        />
        <StatCard
          label="Appointments Today"
          value="14"
          change="3 slots left"
          isPositive={true}
          icon={<Calendar size={20} />}
        />
        <StatCard
          label="Stylists on Duty"
          value="5 / 6"
          icon={<Users size={20} />}
        />
        <StatCard
          label="Branch Average Rating"
          value="4.8 ★"
          change="124 reviews"
          isPositive={true}
          icon={<Star size={20} />}
        />
      </div>

      {/* Master Appointment Queue */}
      <MasterCalendar />
    </div>
  );
}
