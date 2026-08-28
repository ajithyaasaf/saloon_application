'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Calendar,
  Clock,
  Gift,
  ImageIcon,
  LayoutDashboard,
  LogOut,
  Package,
  Scissors,
  Settings,
  Store,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useSalon } from '../../context/SalonContext.js';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/', icon: <LayoutDashboard size={18} /> },
  { label: 'Master Calendar', href: '/calendar', icon: <Calendar size={18} /> },
  { label: 'Branches & Hours', href: '/branches', icon: <Store size={18} /> },
  { label: 'Service Catalog', href: '/services', icon: <Scissors size={18} /> },
  { label: 'Staff & Shifts', href: '/staff', icon: <Clock size={18} /> },
  { label: 'Inventory & Stock', href: '/inventory', icon: <Package size={18} /> },
  { label: 'Promotions & Deals', href: '/promotions', icon: <Gift size={18} /> },
  { label: 'Customers & Reviews', href: '/customers', icon: <Users size={18} /> },
  { label: 'Financial Analytics', href: '/analytics', icon: <BarChart3 size={18} /> },
  { label: 'Media Gallery', href: '/media', icon: <ImageIcon size={18} /> },
  { label: 'Salon Settings', href: '/settings', icon: <Settings size={18} /> },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { salon } = useSalon();

  return (
    <aside
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: 'var(--sidebar-width)',
        background: 'var(--sidebar-background)',
        borderRight: '1px solid var(--sidebar-border)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 40,
      }}
    >
      {/* Brand Logo Header */}
      <div
        style={{
          padding: '1.5rem',
          borderBottom: '1px solid var(--sidebar-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-action-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-inverse)',
            fontWeight: 700,
            fontSize: '1.125rem',
            boxShadow: 'var(--button-primary-shadow)',
          }}
        >
          S
        </div>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, lineHeight: 1.2, color: 'var(--color-text-primary)' }}>
            {salon?.name || 'Saloon Partner'}
          </h2>
          <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            {user?.role ? user.role.replace('_', ' ') : 'Dashboard'}
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav
        style={{
          flex: 1,
          padding: '1rem 0.75rem',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.625rem 0.875rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--sidebar-item-text-active)' : 'var(--sidebar-item-text)',
                background: isActive ? 'var(--sidebar-item-background-active)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--sidebar-item-border-active)' : '3px solid transparent',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ color: isActive ? 'var(--sidebar-item-text-active)' : 'var(--color-text-muted)' }}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer User Info & Logout */}
      <div
        style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid var(--sidebar-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', overflow: 'hidden' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-action-primary-subtle)',
              color: 'var(--color-action-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: '0.8125rem',
            }}
          >
            {user?.firstName?.[0] || 'U'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', color: 'var(--color-text-primary)' }}>
              {user?.displayName || user?.firstName || 'Staff User'}
            </p>
            <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Online</p>
          </div>
        </div>
        <button
          onClick={() => logout()}
          title="Logout"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            padding: '0.375rem',
            display: 'flex',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
};
