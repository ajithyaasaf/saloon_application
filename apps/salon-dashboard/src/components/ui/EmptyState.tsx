'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from './Button.js';

export interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionText,
  onAction,
  icon,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        textAlign: 'center',
        borderRadius: 'var(--radius-lg)',
        border: '1px dashed var(--color-border-subtle)',
        background: 'var(--color-background-surface)',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: 'var(--radius-full)',
          background: 'var(--primary-light)',
          color: 'var(--text-accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1rem',
        }}
      >
        {icon || <Sparkles size={24} />}
      </div>
      <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>{title}</h4>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '400px', marginBottom: '1.25rem' }}>
        {description}
      </p>
      {actionText && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};
