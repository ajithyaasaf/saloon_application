'use client';

import React from 'react';
import { Bell, MapPin, Store, Palette } from 'lucide-react';
import { useSalon } from '../../context/SalonContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { useTheme } from '../../context/ThemeContext.js';
import { Badge } from '../ui/Badge.js';

export const Header: React.FC = () => {
  const { branches, selectedBranch, selectBranch } = useSalon();
  const { user } = useAuth();
  const { activeThemeId, setTheme } = useTheme();

  return (
    <header
      style={{
        height: 'var(--header-height)',
        borderBottom: '1px solid var(--header-border)',
        background: 'var(--header-background)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      {/* Branch Selector Dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--input-background)',
            border: '1px solid var(--input-border)',
            padding: '0.4rem 0.875rem',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <Store size={16} style={{ color: 'var(--color-action-primary)' }} />
          <select
            value={selectedBranch?.id || ''}
            onChange={(e) => selectBranch(e.target.value)}
            aria-label="Select Branch"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-primary)',
              fontSize: '0.875rem',
              fontWeight: 500,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {branches.length === 0 ? (
              <option value="">Main Branch</option>
            ) : (
              branches.map((b) => (
                <option key={b.id} value={b.id} style={{ background: 'var(--color-background-elevated)', color: 'var(--color-text-primary)' }}>
                  {b.name} ({b.city})
                </option>
              ))
            )}
          </select>
        </div>

        {selectedBranch && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            <MapPin size={12} /> {selectedBranch.city}
          </span>
        )}
      </div>

      {/* Right Controls: Theme Selector + Notifications + Role Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Centralized Theme Switcher */}
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

        <button
          aria-label="Notifications"
          style={{
            background: 'var(--color-action-secondary)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-full)',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          <Bell size={16} />
          <span
            style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--color-action-primary)',
            }}
          />
        </button>

        <Badge variant="primary">{user?.role?.replace('SALON_', '') || 'STAFF'}</Badge>
      </div>
    </header>
  );
};
