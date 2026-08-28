'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { BranchDto, SalonDto } from '@saloon/shared-types';
import { salonService } from '../services/salon-domain.services.js';
import { useAuth } from './AuthContext.js';

export interface SalonContextType {
  salon: SalonDto | null;
  branches: BranchDto[];
  selectedBranch: BranchDto | null;
  isLoading: boolean;
  selectBranch: (branchId: string) => void;
  refreshSalonData: () => Promise<void>;
}

const SalonContext = createContext<SalonContextType | undefined>(undefined);

export const SalonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [salon, setSalon] = useState<SalonDto | null>(null);
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<BranchDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const loadSalonData = async () => {
    if (!isAuthenticated || !user?.salonId) return;

    setIsLoading(true);
    try {
      const salonData = await salonService.getSalon(user.salonId);
      setSalon(salonData);

      const branchList = await salonService.getBranches(user.salonId);
      setBranches(branchList);

      if (branchList.length > 0) {
        const defaultBranch =
          user.branchId
            ? branchList.find((b) => b.id === user.branchId) || branchList[0]
            : branchList[0];
        setSelectedBranch(defaultBranch || null);
      }
    } catch (err) {
      console.error('Failed to load salon/branches:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSalonData();
  }, [isAuthenticated, user?.salonId]);

  const selectBranch = (branchId: string) => {
    const target = branches.find((b) => b.id === branchId);
    if (target) {
      setSelectedBranch(target);
    }
  };

  return (
    <SalonContext.Provider
      value={{
        salon,
        branches,
        selectedBranch,
        isLoading,
        selectBranch,
        refreshSalonData: loadSalonData,
      }}
    >
      {children}
    </SalonContext.Provider>
  );
};

export const useSalon = (): SalonContextType => {
  const context = useContext(SalonContext);
  if (!context) {
    throw new Error('useSalon must be used within a SalonProvider');
  }
  return context;
};
