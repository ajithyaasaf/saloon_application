'use client';

import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  className = '',
}) => {
  return <span className={`badge badge-${variant} ${className}`.trim()}>{children}</span>;
};
