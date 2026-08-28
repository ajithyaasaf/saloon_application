import React from 'react';
import clsx from 'clsx';

export interface AppSelectOption {
  value: string;
  label: string;
}

export interface AppSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: AppSelectOption[];
  error?: string;
  helperText?: string;
}

export const AppSelect = React.forwardRef<HTMLSelectElement, AppSelectProps>(
  ({ label, options, error, helperText, className, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="form-group">
        {label && (
          <label htmlFor={selectId} className="form-label">
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={clsx('form-select', error && 'has-error', className)}
          style={{
            borderColor: error ? 'var(--color-status-error)' : undefined,
          }}
          {...props}
        >
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              style={{ background: 'var(--color-background-elevated)', color: 'var(--color-text-primary)' }}
            >
              {opt.label}
            </option>
          ))}
        </select>
        {error ? (
          <span style={{ fontSize: '0.75rem', color: 'var(--color-status-error)', marginTop: '0.25rem' }}>
            {error}
          </span>
        ) : helperText ? (
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            {helperText}
          </span>
        ) : null}
      </div>
    );
  }
);

AppSelect.displayName = 'AppSelect';
