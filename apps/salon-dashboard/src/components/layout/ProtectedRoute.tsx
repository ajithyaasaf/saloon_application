'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && !isAuthenticated) {
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.replace('/login');
      }
    }
  }, [mounted, authLoading, isAuthenticated]);

  // If not authenticated, immediately direct to login
  if (mounted && !authLoading && !isAuthenticated) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--color-background-canvas, #080A0C)',
          color: 'var(--color-text-primary, #F8F9FA)',
          gap: '1rem',
        }}
      >
        <p style={{ color: 'var(--color-text-secondary, #CED4DA)', fontSize: '0.875rem' }}>
          Redirecting to partner login...
        </p>
        <a
          href="/login"
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--color-action-primary, #D4AF37)',
            color: 'var(--color-text-inverse, #080A0C)',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '0.8125rem',
            textDecoration: 'none',
          }}
        >
          Go to Sign In
        </a>
      </div>
    );
  }

  if (authLoading || !mounted) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--color-background-canvas, #080A0C)',
          color: 'var(--color-text-primary, #F8F9FA)',
          fontSize: '1rem',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem', animation: 'spin 1s linear infinite' }}>⏳</div>
          <p style={{ color: 'var(--color-text-secondary, #CED4DA)', fontSize: '0.875rem' }}>
            Loading Saloon Workspace...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
