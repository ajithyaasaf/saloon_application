'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthSessionUserDto, PasswordLoginRequestDto, UserRole } from '@saloon/shared-types';
import { authService } from '../services/admin-domain.services';
import { tokenStorage } from '../services/api.service';

export interface AuthContextType {
  user: AuthSessionUserDto | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: PasswordLoginRequestDto) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthSessionUserDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = tokenStorage.getAccessToken();
        const storedUser = typeof window !== 'undefined' ? localStorage.getItem('saloon_admin_user_session') : null;

        if (storedToken && storedUser) {
          const parsedUser: AuthSessionUserDto = JSON.parse(storedUser);
          if (parsedUser.role === UserRole.SUPER_ADMIN) {
            setUser(parsedUser);
          } else {
            // Not a super admin - clear tokens
            tokenStorage.clearTokens();
          }
        }
      } catch (err) {
        console.error('Failed to restore admin session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials: PasswordLoginRequestDto) => {
    setIsLoading(true);
    try {
      const authResponse = await authService.login(credentials);
      if (authResponse.user.role !== UserRole.SUPER_ADMIN) {
        tokenStorage.clearTokens();
        throw new Error('Access denied. Only Super Administrators can access this portal.');
      }
      setUser(authResponse.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSession = async () => {
    try {
      const me = await authService.getMe();
      if (me.role !== UserRole.SUPER_ADMIN) {
        await logout();
        return;
      }
      const sessionUser: AuthSessionUserDto = {
        id: me.id,
        phone: me.phone,
        email: me.email,
        firstName: me.firstName,
        lastName: me.lastName,
        displayName: me.displayName,
        role: me.role,
        avatarUrl: me.avatar?.url,
      };
      setUser(sessionUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('saloon_admin_user_session', JSON.stringify(sessionUser));
      }
    } catch (err) {
      console.error('Failed to refresh user profile:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user && user.role === UserRole.SUPER_ADMIN,
        isLoading,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
