import React from 'react';
import clsx from 'clsx';

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
  | 'primary'
  | 'neutral';

export interface AppBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

export const AppBadge: React.FC<AppBadgeProps> = ({
  children,
  variant = 'neutral',
  dot = false,
  className,
  ...props
}) => {
  return (
    <span className={clsx('badge', `badge-${variant}`, className)} {...props}>
      {dot && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: 'currentColor',
            display: 'inline-block',
          }}
        />
      )}
      {children}
    </span>
  );
};
