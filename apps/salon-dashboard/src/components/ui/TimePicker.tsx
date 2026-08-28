'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Clock, ChevronDown, Check, Sun, Moon, Sunrise } from 'lucide-react';
import { format12HourTime } from '@saloon/shared-utils';

export interface TimePickerProps {
  label?: string;
  value: string; // "HH:mm" (24-hour format, e.g. "09:00", "20:00")
  onChange: (timeStr: string) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  id?: string;
  className?: string;
  stepMinutes?: number; // default 30
  align?: 'left' | 'right' | 'auto';
}

type PeriodTab = 'MORNING' | 'AFTERNOON' | 'EVENING';

interface TimeSlot {
  value: string; // "09:00"
  label: string; // "09:00 AM"
  period: PeriodTab;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  label,
  value,
  onChange,
  required,
  disabled,
  error,
  helperText,
  id,
  className = '',
  stepMinutes = 30,
  align = 'auto',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState<'left' | 'right'>('left');
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-detect alignment to prevent horizontal modal overflow
  useEffect(() => {
    if (isOpen && containerRef.current) {
      if (align === 'right') {
        setPlacement('right');
      } else if (align === 'left') {
        setPlacement('left');
      } else {
        const rect = containerRef.current.getBoundingClientRect();
        // If the right side of the element is past the halfway mark of the viewport or parent, align right
        const parent = containerRef.current.parentElement;
        const parentRect = parent ? parent.getBoundingClientRect() : null;
        if (parentRect && rect.left - parentRect.left > parentRect.width / 2 - 20) {
          setPlacement('right');
        } else if (window.innerWidth - rect.right < 260) {
          setPlacement('right');
        } else {
          setPlacement('left');
        }
      }
    }
  }, [isOpen, align]);

  // Parse initial period from current value
  const initialPeriod = useMemo<PeriodTab>(() => {
    if (!value) return 'MORNING';
    const match = value.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/);
    if (!match) return 'MORNING';
    const hour = parseInt(match[1]!, 10);
    if (hour < 12) return 'MORNING';
    if (hour < 17) return 'AFTERNOON';
    return 'EVENING';
  }, [value]);

  const [activeTab, setActiveTab] = useState<PeriodTab>(initialPeriod);

  // Keep tab synced if external value changes
  useEffect(() => {
    setActiveTab(initialPeriod);
  }, [initialPeriod]);

  // Generate slots for Morning (06:00 - 11:30), Afternoon (12:00 - 16:30), Evening (17:00 - 23:30)
  const allSlots = useMemo<TimeSlot[]>(() => {
    const slots: TimeSlot[] = [];
    const step = Math.max(5, stepMinutes);

    for (let m = 360; m <= 1410; m += step) {
      const h = Math.floor(m / 60);
      const mins = m % 60;
      const hh = h.toString().padStart(2, '0');
      const mm = mins.toString().padStart(2, '0');
      const val = `${hh}:${mm}`;

      let period: PeriodTab = 'MORNING';
      if (h >= 12 && h < 17) period = 'AFTERNOON';
      else if (h >= 17) period = 'EVENING';

      slots.push({
        value: val,
        label: format12HourTime(val),
        period,
      });
    }

    if (value && !slots.some((s) => s.value === value)) {
      const match = value.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/);
      if (match) {
        const h = parseInt(match[1]!, 10);
        let period: PeriodTab = 'MORNING';
        if (h >= 12 && h < 17) period = 'AFTERNOON';
        else if (h >= 17) period = 'EVENING';

        slots.push({
          value,
          label: format12HourTime(value),
          period,
        });
        slots.sort((a, b) => a.value.localeCompare(b.value));
      }
    }

    return slots;
  }, [stepMinutes, value]);

  const filteredSlots = useMemo(() => {
    return allSlots.filter((s) => s.period === activeTab);
  }, [allSlots, activeTab]);

  // Close on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectSlot = (slotValue: string) => {
    onChange(slotValue);
    setIsOpen(false);
  };

  const formattedDisplayValue = value ? format12HourTime(value) : 'Select Time';

  return (
    <div
      ref={containerRef}
      className={`form-group ${className}`.trim()}
      style={{ position: 'relative', width: '100%' }}
    >
      {label && (
        <label className="form-label" style={{ display: 'block', marginBottom: '0.375rem' }}>
          {label}
          {required && <span style={{ color: 'var(--color-status-error)', marginLeft: '0.25rem' }}>*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.625rem 0.75rem',
          background: 'var(--color-background-surface)',
          border: '1px solid',
          borderColor: error
            ? 'var(--color-status-error)'
            : isOpen
            ? 'var(--color-action-primary)'
            : 'var(--color-border-default)',
          borderRadius: 'var(--radius-md)',
          color: value ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
          fontSize: '0.875rem',
          fontWeight: 600,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          transition: 'all 0.15s ease',
          outline: 'none',
          boxShadow: isOpen ? '0 0 0 3px var(--color-action-primary-subtle)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, overflow: 'hidden' }}>
          <div
            style={{
              color: isOpen ? 'var(--color-action-primary)' : 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <Clock size={15} />
          </div>
          <span style={{ letterSpacing: '0.01em', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {formattedDisplayValue}
          </span>
        </div>

        <div
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            color: 'var(--color-text-muted)',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            marginLeft: '0.25rem',
          }}
        >
          <ChevronDown size={15} />
        </div>
      </button>

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

      {/* Floating Popover Picker */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: placement === 'left' ? 0 : 'auto',
            right: placement === 'right' ? 0 : 'auto',
            width: '235px',
            background: 'var(--color-background-surface)',
            border: '1px solid var(--color-border-default)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 12px 28px -4px rgba(0, 0, 0, 0.16), 0 4px 10px -2px rgba(0, 0, 0, 0.06)',
            zIndex: 9999,
            overflow: 'hidden',
          }}
        >
          {/* Header Period Tabs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              padding: '0.25rem',
              background: 'var(--color-background-inset)',
              borderBottom: '1px solid var(--color-border-subtle)',
              gap: '0.2rem',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('MORNING')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.2rem',
                padding: '0.35rem 0.15rem',
                fontSize: '0.6875rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: activeTab === 'MORNING' ? 'var(--color-background-surface)' : 'transparent',
                color: activeTab === 'MORNING' ? 'var(--color-action-primary)' : 'var(--color-text-muted)',
                boxShadow: activeTab === 'MORNING' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <Sunrise size={11} />
              <span>Morning</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('AFTERNOON')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.2rem',
                padding: '0.35rem 0.15rem',
                fontSize: '0.6875rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: activeTab === 'AFTERNOON' ? 'var(--color-background-surface)' : 'transparent',
                color: activeTab === 'AFTERNOON' ? 'var(--color-action-primary)' : 'var(--color-text-muted)',
                boxShadow: activeTab === 'AFTERNOON' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <Sun size={11} />
              <span>Afternoon</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('EVENING')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.2rem',
                padding: '0.35rem 0.15rem',
                fontSize: '0.6875rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: activeTab === 'EVENING' ? 'var(--color-background-surface)' : 'transparent',
                color: activeTab === 'EVENING' ? 'var(--color-action-primary)' : 'var(--color-text-muted)',
                boxShadow: activeTab === 'EVENING' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <Moon size={11} />
              <span>Evening</span>
            </button>
          </div>

          {/* Time Slots Grid */}
          <div
            style={{
              padding: '0.5rem',
              maxHeight: '190px',
              overflowY: 'auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '0.3rem',
            }}
          >
            {filteredSlots.map((slot) => {
              const isSelected = slot.value === value;
              return (
                <button
                  key={slot.value}
                  type="button"
                  onClick={() => handleSelectSlot(slot.value)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.45rem 0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: isSelected ? 700 : 500,
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid',
                    borderColor: isSelected
                      ? 'var(--color-action-primary)'
                      : 'var(--color-border-subtle)',
                    background: isSelected
                      ? 'var(--color-action-primary)'
                      : 'var(--color-background-surface)',
                    color: isSelected ? '#FFFFFF' : 'var(--color-text-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'var(--color-action-secondary)';
                      e.currentTarget.style.borderColor = 'var(--color-border-default)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'var(--color-background-surface)';
                      e.currentTarget.style.borderColor = 'var(--color-border-subtle)';
                    }
                  }}
                >
                  <span>{slot.label}</span>
                  {isSelected && <Check size={12} color="#FFFFFF" />}
                </button>
              );
            })}
          </div>

          {/* Footer Quick Common Presets */}
          <div
            style={{
              padding: '0.375rem 0.5rem',
              background: 'var(--color-background-inset)',
              borderTop: '1px solid var(--color-border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Quick:
            </span>
            <div style={{ display: 'flex', gap: '0.2rem' }}>
              {['09:00', '13:00', '18:00', '20:00'].map((quickVal) => (
                <button
                  key={quickVal}
                  type="button"
                  onClick={() => handleSelectSlot(quickVal)}
                  style={{
                    fontSize: '0.625rem',
                    padding: '0.15rem 0.3rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border-subtle)',
                    background: 'var(--color-background-surface)',
                    color: 'var(--color-text-secondary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {format12HourTime(quickVal)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
