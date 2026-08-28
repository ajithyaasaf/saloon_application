'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

export const Breadcrumbs: React.FC = () => {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
        <Home size={14} color="var(--primary)" />
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Command Center</span>
      </div>
    );
  }

  return (
    <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
      <Link
        href="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          color: 'var(--text-muted)',
          transition: 'color 0.15s ease',
        }}
      >
        <Home size={14} />
        <span>Platform</span>
      </Link>

      {segments.map((segment, index) => {
        const url = `/${segments.slice(0, index + 1).join('/')}`;
        const isLast = index === segments.length - 1;
        const formatted = segment
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());

        return (
          <React.Fragment key={url}>
            <ChevronRight size={12} color="var(--text-muted)" />
            {isLast ? (
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{formatted}</span>
            ) : (
              <Link
                href={url}
                style={{ color: 'var(--text-muted)', transition: 'color 0.15s ease' }}
              >
                {formatted}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
