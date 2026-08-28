import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { tokenStorage } from '../services/api.service';
import { authService } from '../services/admin-domain.services';
import { UserRole } from '@saloon/shared-types';

jest.mock('../services/admin-domain.services');

const TestConsumer: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  return (
    <div>
      <div data-testid="auth-state">{isAuthenticated ? 'AUTHENTICATED' : 'ANONYMOUS'}</div>
      <div data-testid="user-role">{user?.role || 'NONE'}</div>
    </div>
  );
};

describe('Admin Dashboard AuthContext', () => {
  beforeEach(() => {
    tokenStorage.clearTokens();
    jest.clearAllMocks();
  });

  it('initializes in unauthenticated state when no tokens exist', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(await screen.findByTestId('auth-state')).toHaveTextContent('ANONYMOUS');
    expect(screen.getByTestId('user-role')).toHaveTextContent('NONE');
  });

  it('restores super admin session when valid token and session user exist in localStorage', async () => {
    tokenStorage.setAccessToken('mock-admin-token');
    localStorage.setItem(
      'saloon_admin_user_session',
      JSON.stringify({
        id: 'admin-123',
        email: 'superadmin@saloon.com',
        firstName: 'Master',
        lastName: 'Admin',
        role: UserRole.SUPER_ADMIN,
      })
    );

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(await screen.findByTestId('auth-state')).toHaveTextContent('AUTHENTICATED');
    expect(screen.getByTestId('user-role')).toHaveTextContent(UserRole.SUPER_ADMIN);
  });

  it('rejects session restoration if stored user is not a SUPER_ADMIN', async () => {
    tokenStorage.setAccessToken('mock-customer-token');
    localStorage.setItem(
      'saloon_admin_user_session',
      JSON.stringify({
        id: 'cust-123',
        email: 'customer@saloon.com',
        firstName: 'Normal',
        lastName: 'User',
        role: UserRole.CUSTOMER,
      })
    );

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(await screen.findByTestId('auth-state')).toHaveTextContent('ANONYMOUS');
    expect(tokenStorage.getAccessToken()).toBeNull();
  });
});
