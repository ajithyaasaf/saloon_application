import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthSessionUserDto, UserProfileDto, VerifyOtpRequestDto } from '@saloon/shared-types';
import { authService } from '../services/customer-domain.services';
import { tokenStorage } from '../services/api.service';

interface AuthContextType {
  user: AuthSessionUserDto | UserProfileDto | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  phoneDraft: string;
  setPhoneDraft: (phone: string) => void;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (otp: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthSessionUserDto | UserProfileDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [phoneDraft, setPhoneDraft] = useState('');

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = tokenStorage.getUserSession();
        const accessToken = tokenStorage.getAccessToken();

        if (accessToken && storedUser) {
          setUser(JSON.parse(storedUser));
          const profile = await authService.getMe();
          if (profile) {
            setUser(profile);
          }
        }
      } catch (err) {
        tokenStorage.clearTokens();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const sendOtp = async (phone: string) => {
    setPhoneDraft(phone);
    await authService.sendOtp(phone);
  };

  const verifyOtp = async (otp: string) => {
    const payload: VerifyOtpRequestDto = {
      phone: phoneDraft,
      otp,
    };
    const res = await authService.verifyOtp(payload);
    if (res.user) {
      setUser(res.user);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setPhoneDraft('');
    }
  };

  const refreshProfile = async () => {
    try {
      const profile = await authService.getMe();
      if (profile) {
        setUser(profile);
      }
    } catch {
      // Ignored
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        phoneDraft,
        setPhoneDraft,
        sendOtp,
        verifyOtp,
        logout,
        refreshProfile,
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
