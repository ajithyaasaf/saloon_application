'use client';

import React, { useMemo } from 'react';
import { generateTimeOptions } from '@saloon/shared-utils';
import { Clock } from 'lucide-react';

export interface TimeSelectProps {
  label?: string;
  value: string; // "HH:mm" (e.g. "09:00", "20:00")
  onChange: (timeStr: string) => void;
  stepMinutes?: number; // default 30
  startMinute?: number; // default 360 (06:00 AM)
  endMinute?: number;   // default 1410 (11:30 PM)
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export const TimeSelect: React.FC<TimeSelectProps> = ({
  label,
  value,
  onChange,
  stepMinutes = 30,
  startMinute = 360,
  endMinute = 1410,
  error,
  helperText,
  required,
  disabled,
  id,
  className = '',
}) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  const options = useMemo(() => {
    const opts = generateTimeOptions(stepMinutes, startMinute, endMinute);
    if (value && !opts.some((o) => o.value === value)) {
      const match = value.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/);
      if (match) {
        const hours = parseInt(match[1]!, 10);
        const mins = match[2]!;
        const period = hours >= 12 ? 'PM' : 'AM';
        const hours12 = hours % 12 === 0 ? 12 : hours % 12;
        const customLabel = `${hours12.toString().padStart(2, '0')}:${mins} ${period}`;
        opts.push({ value, label: customLabel });
        opts.sort((a, b) => a.value.localeCompare(b.value));
      }
    }
    return opts;
  }, [stepMinutes, startMinute, endMinute, value]);

  return (
    <div className="form-group" style={{ position: 'relative' }}>
      {label && (
        <label htmlFor={selectId} className="form-label">
          {label}
          {required && <span style={{ color: 'var(--color-status-error)', marginLeft: '0.25rem' }}>*</span>}
        </label>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <select
          id={selectId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`form-select ${className}`.trim()}
          style={{
            paddingRight: '2.5rem',
            borderColor: error ? 'var(--color-status-error)' : undefined,
            fontWeight: 500,
          }}
        >
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              style={{
                background: 'var(--color-background-elevated)',
                color: 'var(--color-text-primary)',
                fontWeight: opt.value === value ? 600 : 400,
              }}
            >
              {opt.label}
            </option>
          ))}
        </select>
        <div
          style={{
            position: 'absolute',
            right: '0.875rem',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            color: 'var(--color-text-muted)',
          }}
        >
          <Clock size={15} />
        </div>
      </div>

      {error && (
        <span style={{ fontSize: '0.75rem', color: 'var(--color-status-error)', marginTop: '0.25rem', display: 'block' }}>
          {error}
        </span>
      )}
      {!error && helperText && (
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', display: 'block' }}>
          {helperText}
        </span>
      )}
    </div>
  );
};
