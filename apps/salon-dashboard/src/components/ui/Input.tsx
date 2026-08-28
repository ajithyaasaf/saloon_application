'use client';

import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {leftIcon && (
          <span
            style={{
              position: 'absolute',
              left: '0.875rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          className={`form-input ${className}`.trim()}
          style={{
            paddingLeft: leftIcon ? '2.5rem' : '0.875rem',
            paddingRight: rightIcon ? '2.5rem' : '0.875rem',
            borderColor: error ? 'var(--danger)' : undefined,
          }}
          {...props}
        />
        {rightIcon && (
          <span
            style={{
              position: 'absolute',
              right: '0.875rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {rightIcon}
          </span>
        )}
      </div>
      {error && (
        <span style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.25rem' }}>
          {error}
        </span>
      )}
      {!error && helperText && (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          {helperText}
        </span>
      )}
    </div>
  );
};
