'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Sparkles } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext.js';
import { Button } from '../../../components/ui/Button.js';
import { Input } from '../../../components/ui/Input.js';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState<string>('owner@glamourluxe.com');
  const [password, setPassword] = useState<string>('Password@123');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await login({ email, password });
      router.push('/');
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(err.message || 'Invalid credentials. Please check your email and password.');
    } finally {
      setIsLoading(false);
    }
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
          maxWidth: '440px',
          width: '100%',
          padding: '2.5rem 2rem',
          backgroundColor: 'var(--card-background)',
          border: '1px solid var(--card-border)',
          borderRadius: 'var(--card-radius)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
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
            <Sparkles size={24} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--color-text-primary)' }}>
            Saloon Partner Portal
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '0.375rem' }}>
            Sign in to manage your salon appointments & operations
          </p>
        </div>

        {/* Demo Credentials Quick-Fill Card */}
        <div
          onClick={() => {
            setEmail('owner@glamourluxe.com');
            setPassword('Password@123');
          }}
          style={{
            padding: '0.875rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-action-primary-subtle)',
            border: '1px dashed var(--color-action-primary)',
            marginBottom: '1.5rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          title="Click to auto-fill credentials"
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
            Email: <strong style={{ color: 'var(--color-text-primary)' }}>owner@glamourluxe.com</strong>
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            Password: <strong style={{ color: 'var(--color-text-primary)' }}>Password@123</strong>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-status-error-subtle)',
              border: '1px solid var(--color-status-error-border)',
              color: 'var(--color-status-error)',
              fontSize: '0.8125rem',
              marginBottom: '1.5rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Input
            label="Business Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail size={16} />}
            placeholder="owner@saloon.com"
          />

          <Input
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock size={16} />}
            placeholder="••••••••"
          />

          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            style={{ width: '100%', marginTop: '0.75rem', padding: '0.75rem' }}
          >
            Sign In to Dashboard
          </Button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          Protected by Saloon Multi-Tenant Security & JWT Token Rotation
        </div>
      </div>
    </div>
  );
}
