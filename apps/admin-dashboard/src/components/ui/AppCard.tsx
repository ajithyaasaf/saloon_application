import React from 'react';
import clsx from 'clsx';

export interface AppCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  glass?: boolean;
}

export const AppCard: React.FC<AppCardProps> = ({
  children,
  title,
  subtitle,
  headerAction,
  footer,
  glass = true,
  className,
  ...props
}) => {
  return (
    <div
      className={clsx(glass ? 'glass-panel' : 'surface-card', className)}
      style={{
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
      {...props}
    >
      {(title || headerAction) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '0.75rem',
          }}
        >
          <div>
            {typeof title === 'string' ? (
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{title}</h3>
            ) : (
              title
            )}
            {subtitle && (
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)',
                  marginTop: '0.125rem',
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div style={{ flex: 1 }}>{children}</div>
      {footer && (
        <div
          style={{
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '0.75rem',
            marginTop: 'auto',
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
};
