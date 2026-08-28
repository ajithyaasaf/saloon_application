'use client';

import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastProps {
  id: string;
  type?: 'success' | 'danger' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  type = 'info',
  title,
  message,
  duration = 4000,
  onClose,
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} color="var(--color-status-success)" />;
      case 'danger':
        return <AlertCircle size={18} color="var(--color-status-error)" />;
      case 'warning':
        return <AlertTriangle size={18} color="var(--color-status-warning)" />;
      default:
        return <Info size={18} color="var(--color-status-info)" />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return 'var(--color-status-success-border)';
      case 'danger':
        return 'var(--color-status-error-border)';
      case 'warning':
        return 'var(--color-status-warning-border)';
      default:
        return 'var(--color-status-info-border)';
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '0.875rem 1.25rem',
        borderRadius: 'var(--radius-md)',
        background: 'var(--modal-background)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${getBorderColor()}`,
        boxShadow: 'var(--shadow-lg)',
        minWidth: '320px',
        maxWidth: '420px',
      }}
    >
      <div style={{ flexShrink: 0, marginTop: '2px' }}>{getIcon()}</div>
      <div style={{ flex: 1 }}>
        <h5 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {title}
        </h5>
        {message && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            {message}
          </p>
        )}
      </div>
      <button
        onClick={onClose}
        aria-label="Close notification"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--color-text-muted)',
          cursor: 'pointer',
          padding: '2px',
          display: 'flex',
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
};
