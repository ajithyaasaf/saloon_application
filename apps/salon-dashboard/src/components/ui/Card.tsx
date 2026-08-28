'use client';

import React from 'react';

export interface CardProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerBorder?: boolean;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  actions,
  children,
  className = '',
  headerBorder = true,
}) => {
  return (
    <div className={`glass-panel ${className}`.trim()} style={{ padding: '1.5rem' }}>
      {(title || actions) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
            paddingBottom: headerBorder ? '1rem' : '0',
            borderBottom: headerBorder ? '1px solid var(--border-subtle)' : 'none',
          }}
        >
          <div>
            {title && <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{title}</h3>}
            {subtitle && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
