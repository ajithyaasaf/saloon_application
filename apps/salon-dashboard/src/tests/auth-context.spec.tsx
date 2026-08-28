import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext.js';
import { authService } from '../services/salon-domain.services.js';
import { UserRole } from '@saloon/shared-types';

jest.mock('../services/salon-domain.services.js', () => ({
  authService: {
    login: jest.fn(),
    logout: jest.fn(),
    getMe: jest.fn(),
  },
}));

const TestConsumer: React.FC = () => {
  const { user, isAuthenticated, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="auth-status">{isAuthenticated ? 'LOGGED_IN' : 'LOGGED_OUT'}</span>
      <span data-testid="user-name">{user?.firstName || 'None'}</span>
      <button
        onClick={() =>
          login({ email: 'owner@test.com', password: 'password123' })
        }
      >
        Trigger Login
      </button>
      <button onClick={() => logout()}>Trigger Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('should initialize as logged out', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('LOGGED_OUT');
    expect(screen.getByTestId('user-name')).toHaveTextContent('None');
  });

  it('should update state when login succeeds', async () => {
    (authService.login as jest.Mock).mockResolvedValueOnce({
      tokens: { accessToken: 'acc_token', refreshToken: 'ref_token', expiresIn: 900, tokenType: 'Bearer' },
      user: { id: 'u_1', email: 'owner@test.com', firstName: 'Priya', role: UserRole.SALON_OWNER },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText('Trigger Login').click();
    });

    expect(screen.getByTestId('auth-status')).toHaveTextContent('LOGGED_IN');
    expect(screen.getByTestId('user-name')).toHaveTextContent('Priya');
  });

  it('should clear state on logout', async () => {
    (authService.login as jest.Mock).mockResolvedValueOnce({
      tokens: { accessToken: 'acc_token', refreshToken: 'ref_token', expiresIn: 900, tokenType: 'Bearer' },
      user: { id: 'u_1', email: 'owner@test.com', firstName: 'Priya', role: UserRole.SALON_OWNER },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText('Trigger Login').click();
    });
    expect(screen.getByTestId('auth-status')).toHaveTextContent('LOGGED_IN');

    await act(async () => {
      screen.getByText('Trigger Logout').click();
    });
    expect(screen.getByTestId('auth-status')).toHaveTextContent('LOGGED_OUT');
  });
});
