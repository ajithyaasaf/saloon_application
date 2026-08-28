'use client';

import React from 'react';
import {
  Calendar,
  DollarSign,
  Package,
  Scissors,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Plus,
  Clock,
  ArrowUpRight,
  Zap,
  Tag,
  UserCheck,
  ShieldCheck,
  Target,
} from 'lucide-react';
import { formatINR } from '@saloon/shared-utils';
import { useSalon } from '../../context/SalonContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { StatCard } from '../../components/ui/StatCard.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import { MasterCalendar } from '../../components/calendar/MasterCalendar.js';
import Link from 'next/link';

export default function DashboardOverviewPage() {
  const { salon, selectedBranch } = useSalon();
  const { user } = useAuth();

  const dailyGoal = 25000;
  const currentRevenue = 18450;
  const goalPercentage = Math.min(100, Math.round((currentRevenue / dailyGoal) * 100));

  const stylistsOnDuty = [
    { name: 'Anita Sharma', role: 'Senior Colorist', status: 'In Service', initials: 'AS' },
    { name: 'Rajesh Kumar', role: 'Master Barber', status: 'Available', initials: 'RK' },
    { name: 'Priya Nair', role: 'Skin Specialist', status: 'In Service', initials: 'PN' },
    { name: 'David Miller', role: 'Stylist', status: 'Break', initials: 'DM' },
    { name: 'Sneha Patel', role: 'Hair Stylist', status: 'Available', initials: 'SP' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Top Banner Greeting */}
      <div
        className="glass-panel"
        style={{
          padding: '1.5rem 2rem',
          background: 'var(--card-background)',
          border: '1px solid var(--color-border-default)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-action-primary)',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Salon Partner HQ
            </span>
            <Badge variant="success">Branch Live • 09:00 AM – 08:00 PM</Badge>
          </div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
            Welcome back, {user?.firstName || 'Elena'} 👋
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
            {salon?.name || 'Saloon Brand'} • {selectedBranch?.name || 'Main Branch'}
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
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
          <Link href="/promotions">
            <Button variant="secondary" leftIcon={<Tag size={16} />}>
              Promotions
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI 4-Column Stats Grid */}
      <div className="grid-cols-4">
        <StatCard
          label="Today's Estimated GMV"
          value={formatINR(currentRevenue)}
          change="↑ 12.5% vs yesterday"
          isPositive={true}
          icon={<DollarSign size={20} />}
        />
        <StatCard
          label="Appointments Today"
          value="14"
          change="3 slots available"
          isPositive={true}
          icon={<Calendar size={20} />}
        />
        <StatCard
          label="Stylists on Duty"
          value="5 / 6"
          change="1 on scheduled leave"
          isPositive={true}
          icon={<Users size={20} />}
        />
        <StatCard
          label="Branch Average Rating"
          value="4.8 ★"
          change="124 verified reviews"
          isPositive={true}
          icon={<Star size={20} />}
        />
      </div>

      {/* Full-Width Master Appointment Queue */}
      <div style={{ width: '100%' }}>
        <MasterCalendar />
      </div>

      {/* Bottom 3-Column Balanced Information Row */}
      <div className="grid-cols-3">
        {/* Daily Revenue Goal Widget */}
        <Card
          title="Daily Revenue Target"
          subtitle="Progress towards branch daily goal"
          actions={
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-status-success)' }}>
              {goalPercentage}% Goal
            </span>
          }
        >
          <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {formatINR(currentRevenue)}
              </span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                Target: <strong>{formatINR(dailyGoal)}</strong>
              </span>
            </div>

            {/* Progress Bar */}
            <div
              style={{
                width: '100%',
                height: '10px',
                background: 'var(--color-background-canvas)',
                borderRadius: 'var(--radius-full)',
                overflow: 'hidden',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              <div
                style={{
                  width: `${goalPercentage}%`,
                  height: '100%',
                  background: 'var(--color-action-primary)',
                  borderRadius: 'var(--radius-full)',
                  transition: 'width 0.5s ease',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              <span>{formatINR(dailyGoal - currentRevenue)} remaining today</span>
              <span>Updated live</span>
            </div>
          </div>
        </Card>

        {/* Stylists on Duty */}
        <Card
          title="Stylists on Duty"
          subtitle={`${stylistsOnDuty.length} team members active today`}
          actions={
            <Link href="/staff">
              <Button variant="secondary" size="sm">
                Roster
              </Button>
            </Link>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginTop: '0.25rem' }}>
            {stylistsOnDuty.slice(0, 3).map((stf) => (
              <div
                key={stf.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.75rem',
                  background: 'var(--color-background-surface)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--color-action-primary-subtle)',
                      color: 'var(--color-action-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                    }}
                  >
                    {stf.initials}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
                      {stf.name}
                    </h4>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>{stf.role}</span>
                  </div>
                </div>

                <Badge variant={stf.status === 'Available' ? 'success' : stf.status === 'In Service' ? 'warning' : 'neutral'}>
                  {stf.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Management Shortcuts */}
        <Card title="Quick Shortcuts" subtitle="Fast administrative operations">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
            <Link href="/services" style={{ textDecoration: 'none' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.625rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border-subtle)',
                  background: 'var(--color-background-surface)',
                  transition: 'all 0.15s ease',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <Scissors size={15} style={{ color: 'var(--color-action-primary)' }} />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                    Add Treatment
                  </span>
                </div>
                <ArrowUpRight size={14} style={{ color: 'var(--color-text-muted)' }} />
              </div>
            </Link>

            <Link href="/promotions" style={{ textDecoration: 'none' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.625rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border-subtle)',
                  background: 'var(--color-background-surface)',
                  transition: 'all 0.15s ease',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <Zap size={15} style={{ color: 'var(--color-action-primary)' }} />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                    Launch Flash Sale
                  </span>
                </div>
                <ArrowUpRight size={14} style={{ color: 'var(--color-text-muted)' }} />
              </div>
            </Link>

            <Link href="/inventory" style={{ textDecoration: 'none' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.625rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border-subtle)',
                  background: 'var(--color-background-surface)',
                  transition: 'all 0.15s ease',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <Package size={15} style={{ color: 'var(--color-action-primary)' }} />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                    Register Stock SKU
                  </span>
                </div>
                <ArrowUpRight size={14} style={{ color: 'var(--color-text-muted)' }} />
              </div>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
