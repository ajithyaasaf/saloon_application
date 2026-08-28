'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { success, danger } = useToast();

  const [email, setEmail] = useState('superadmin@saloon.com');
  const [password, setPassword] = useState('Password@123');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await login({ email, password });
      success('Welcome back, Super Admin');
      router.push('/');
    } catch (err: any) {
      console.error('Login error:', err);
      const msg = err.response?.data?.message || err.message || 'Invalid credentials';
      setError(msg);
      danger(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillTestCredentials = () => {
    setEmail('superadmin@saloon.com');
    setPassword('Password@123');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        backgroundColor: 'var(--color-background-canvas)',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '2.5rem',
          backgroundColor: 'var(--card-background)',
          border: '1px solid var(--card-border)',
          borderRadius: 'var(--card-radius)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        {/* Portal Branding Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--color-action-primary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-inverse)',
              marginBottom: '1rem',
              boxShadow: 'var(--button-primary-shadow)',
            }}
          >
            <ShieldCheck size={28} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--color-text-primary)' }}>
            Super Admin Portal
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '0.375rem' }}>
            Multi-Tenant Platform Governance & Observability
          </p>
        </div>

        {/* Demo Credentials Auto-Fill Banner */}
        <div
          onClick={handleFillTestCredentials}
          style={{
            padding: '0.875rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-action-primary-subtle)',
            border: '1px dashed var(--color-action-primary)',
            marginBottom: '1.5rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="Click to auto-fill development credentials"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-action-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ⚡ Demo Credentials (Click to Fill)
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-action-primary)', background: 'var(--color-action-primary-subtle)', padding: '2px 6px', borderRadius: '4px' }}>
              Local Test
            </span>
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            Email: <strong style={{ color: 'var(--color-text-primary)' }}>superadmin@saloon.com</strong>
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            Password: <strong style={{ color: 'var(--color-text-primary)' }}>Password@123</strong>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-status-error-subtle)',
              border: '1px solid var(--color-status-error-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.5rem',
              color: 'var(--color-status-error)',
              fontSize: '0.8125rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <AppInput
            label="Super Admin Email"
            type="email"
            placeholder="admin@saloon.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <AppInput
            label="Root Password"
            type="password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <AppButton
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            Authenticate into Core System <ArrowRight size={16} />
          </AppButton>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          Strict JWT session rotation & RBAC IP audit enforcement active
        </div>
      </div>
    </div>
  );
}
