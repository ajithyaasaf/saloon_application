'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Breadcrumbs } from './Breadcrumbs';
import { ShieldCheck, LogOut, User, Palette } from 'lucide-react';
import { AppBadge } from '../ui/AppBadge';

export const AdminHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const { activeThemeId, setTheme } = useTheme();

  return (
    <header
      style={{
        height: 'var(--header-height)',
        backgroundColor: 'var(--header-background)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--header-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}
    >
      <Breadcrumbs />

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {/* Centralized Theme Switcher Control */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--input-background)',
            border: '1px solid var(--input-border)',
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <Palette size={15} style={{ color: 'var(--color-action-primary)' }} />
          <select
            value={activeThemeId}
            onChange={(e) => setTheme(e.target.value)}
            aria-label="Select Theme"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-primary)',
              fontSize: '0.75rem',
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="luxury-noir" style={{ background: 'var(--color-background-elevated)', color: 'var(--color-text-primary)' }}>
              Luxury Noir & Gold
            </option>
            <option value="botanical" style={{ background: 'var(--color-background-elevated)', color: 'var(--color-text-primary)' }}>
              Emerald Botanical
            </option>
            <option value="light-minimal" style={{ background: 'var(--color-background-elevated)', color: 'var(--color-text-primary)' }}>
              Light Minimal / Ivory
            </option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={16} color="var(--color-action-primary)" />
          <AppBadge variant="primary" dot>
            Super Admin
          </AppBadge>
        </div>

        <div
          style={{
            height: '24px',
            width: '1px',
            background: 'var(--color-border-subtle)',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-action-primary-subtle)',
              border: '1px solid var(--color-action-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-action-primary)',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            {user?.firstName ? user.firstName[0].toUpperCase() : <User size={16} />}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {user?.displayName || `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()}
            </span>
            <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
              {user?.email || 'superadmin@saloon.com'}
            </span>
          </div>

          <button
            onClick={() => logout()}
            title="Sign out of Admin Portal"
            aria-label="Sign out"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              marginLeft: '0.5rem',
              padding: '0.375rem',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = 'var(--color-status-error)';
              (e.currentTarget as HTMLElement).style.background = 'var(--color-status-error-subtle)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)';
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};
