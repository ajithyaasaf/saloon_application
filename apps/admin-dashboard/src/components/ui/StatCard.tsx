import React from 'react';
import clsx from 'clsx';

export type StatCardVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'error'
  | 'indigo'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'purple'
  | 'blue'
  | 'cyan'
  | 'teal'
  | (string & {});

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  subtitle?: string;
  badge?: React.ReactNode;
  variant?: StatCardVariant;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  subtitle,
  badge,
  variant = 'default',
  onClick,
}) => {
  const getIconContainerStyle = () => {
    switch (variant) {
      case 'success':
      case 'emerald':
        return {
          background: 'var(--color-status-success-subtle)',
          color: 'var(--color-status-success)',
        };
      case 'warning':
      case 'amber':
        return {
          background: 'var(--color-status-warning-subtle)',
          color: 'var(--color-status-warning)',
        };
      case 'error':
      case 'rose':
        return {
          background: 'var(--color-status-error-subtle)',
          color: 'var(--color-status-error)',
        };
      case 'indigo':
      case 'purple':
      case 'blue':
      case 'primary':
      default:
        return {
          background: 'var(--color-action-primary-subtle)',
          color: 'var(--color-action-primary)',
        };
    }
  };

  return (
    <div
      className={clsx('glass-panel', onClick && 'cursor-pointer')}
      style={{
        padding: '1.25rem 1.5rem',
        background: 'var(--card-background)',
        border: '1px solid var(--card-border)',
        borderRadius: 'var(--card-radius)',
        boxShadow: 'var(--card-shadow)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color 0.15s ease, transform 0.15s ease',
      }}
      onClick={onClick}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </span>
        {icon && (
          <div
            style={{
              padding: '0.5rem',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              ...getIconContainerStyle(),
            }}
          >
            {icon}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
          {value}
        </h2>
        {badge}
      </div>

      {(trend || subtitle) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
          {trend && (
            <span
              style={{
                color: trend.isPositive ? 'var(--color-status-success)' : 'var(--color-status-error)',
                fontWeight: 600,
              }}
            >
              {trend.isPositive ? '↑' : '↓'} {trend.value}
            </span>
          )}
          {subtitle && <span style={{ color: 'var(--color-text-muted)' }}>{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
