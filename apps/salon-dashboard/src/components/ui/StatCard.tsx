'use client';

import React from 'react';

export interface StatCardProps {
  label?: string;
  title?: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  title,
  value,
  change,
  isPositive,
  icon,
}) => {
  const displayTitle = title || label || '';

  return (
    <div
      className="glass-panel"
      style={{
        padding: '1.25rem 1.5rem',
        background: 'var(--card-background)',
        border: '1px solid var(--card-border)',
        borderRadius: 'var(--card-radius)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {displayTitle}
        </span>
        {icon && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-action-primary-subtle)',
              color: 'var(--color-action-primary)',
            }}
          >
            {icon}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--color-text-primary)' }}>
          {value}
        </h2>
        {change && (
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: isPositive ? 'var(--color-status-success)' : 'var(--color-status-error)',
            }}
          >
            {isPositive ? '↑' : '↓'} {change}
          </span>
        )}
      </div>
    </div>
  );
};
