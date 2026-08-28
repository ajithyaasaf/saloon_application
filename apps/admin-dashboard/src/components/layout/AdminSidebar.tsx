'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  UserCheck,
  HeartHandshake,
  Calendar,
  CreditCard,
  Scissors,
  Package,
  Tag,
  Star,
  Bell,
  HardDrive,
  Activity,
  Sparkles,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Platform Overview',
    items: [
      { label: 'Command Center', href: '/', icon: <LayoutDashboard size={18} /> },
    ],
  },
  {
    title: 'Governance & Tenants',
    items: [
      { label: 'Salons & Approvals', href: '/salons', icon: <Building2 size={18} /> },
      { label: 'Platform Users', href: '/users', icon: <Users size={18} /> },
      { label: 'Staff Management', href: '/staff', icon: <UserCheck size={18} /> },
      { label: 'Customer CRM', href: '/customers', icon: <HeartHandshake size={18} /> },
    ],
  },
  {
    title: 'Operations & Commerce',
    items: [
      { label: 'Global Bookings', href: '/bookings', icon: <Calendar size={18} /> },
      { label: 'Payments & Refunds', href: '/payments', icon: <CreditCard size={18} /> },
      { label: 'Master Catalog', href: '/catalog', icon: <Scissors size={18} /> },
      { label: 'Inventory Oversight', href: '/inventory', icon: <Package size={18} /> },
    ],
  },
  {
    title: 'Engagement & Media',
    items: [
      { label: 'Promotions & Deals', href: '/promotions', icon: <Tag size={18} /> },
      { label: 'Review Moderation', href: '/reviews', icon: <Star size={18} /> },
      { label: 'Broadcasts & Alerts', href: '/notifications', icon: <Bell size={18} /> },
      { label: 'Media Governance', href: '/media', icon: <HardDrive size={18} /> },
    ],
  },
  {
    title: 'System Telemetry',
    items: [
      { label: 'Health & Readiness', href: '/health', icon: <Activity size={18} /> },
    ],
  },
];

export const AdminSidebar: React.FC = () => {
  const pathname = usePathname();

  const isLinkActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      style={{
        width: 'var(--sidebar-width)',
        backgroundColor: 'var(--sidebar-background)',
        borderRight: '1px solid var(--sidebar-border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        zIndex: 50,
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          height: 'var(--header-height)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0 1.5rem',
          borderBottom: '1px solid var(--sidebar-border)',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-action-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-inverse)',
            boxShadow: 'var(--button-primary-shadow)',
          }}
        >
          <Sparkles size={18} />
        </div>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.2, color: 'var(--color-text-primary)' }}>
            SALOON
          </h2>
          <span style={{ fontSize: '0.6875rem', color: 'var(--color-action-primary)', fontWeight: 600, letterSpacing: '0.05em' }}>
            SUPER ADMIN
          </span>
        </div>
      </div>

      <div style={{ flex: 1, padding: '1.25rem 0.875rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {navSections.map((section) => (
          <div key={section.title}>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--color-text-muted)',
                padding: '0 0.75rem',
                display: 'block',
                marginBottom: '0.375rem',
              }}
            >
              {section.title}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
              {section.items.map((item) => {
                const active = isLinkActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.625rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.8125rem',
                      fontWeight: active ? 600 : 500,
                      color: active ? 'var(--sidebar-item-text-active)' : 'var(--sidebar-item-text)',
                      backgroundColor: active ? 'var(--sidebar-item-background-active)' : 'transparent',
                      borderLeft: active ? '3px solid var(--sidebar-item-border-active)' : '3px solid transparent',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ color: active ? 'var(--sidebar-item-text-active)' : 'var(--color-text-muted)' }}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};
