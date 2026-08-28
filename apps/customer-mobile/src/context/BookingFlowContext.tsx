import React, { createContext, useContext, useState } from 'react';
import {
  AvailableTimeSlotDto,
  BranchDto,
  SalonDto,
  ServiceDto,
  ValidateCouponResponseDto,
} from '@saloon/shared-types';
import { calculateGST } from '@saloon/shared-utils';
import { customerBookingService, promotionService } from '../services/customer-domain.services';

export interface BookingDraft {
  salon: SalonDto | null;
  branch: BranchDto | null;
  services: ServiceDto[];
  stylistId?: string;
  stylistName?: string;
  selectedDate: string; // YYYY-MM-DD
  selectedSlot: AvailableTimeSlotDto | null;
  lockKey?: string;
  couponCode?: string;
  appliedCoupon: ValidateCouponResponseDto | null;
  useWalletBalance: boolean;
}

interface BookingFlowContextType {
  draft: BookingDraft;
  setSalonAndBranch: (salon: SalonDto, branch?: BranchDto) => void;
  setServices: (services: ServiceDto[]) => void;
  setDateTimeSlot: (date: string, slot: AvailableTimeSlotDto) => void;
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
  toggleWalletUsage: () => void;
  acquireSlotLock: () => Promise<boolean>;
  releaseSlotLock: () => Promise<void>;
  resetDraft: () => void;
  getPricingSummary: () => {
    subtotal: number;
    gstAmount: number;
    discountAmount: number;
    walletDebit: number;
    finalPayable: number;
  };
}

const initialDraft: BookingDraft = {
  salon: null,
  branch: null,
  services: [],
  selectedDate: new Date().toISOString().split('T')[0] || '',
  selectedSlot: null,
  appliedCoupon: null,
  useWalletBalance: false,
};

const BookingFlowContext = createContext<BookingFlowContextType | undefined>(undefined);

export const BookingFlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [draft, setDraft] = useState<BookingDraft>(initialDraft);

  const setSalonAndBranch = (salon: SalonDto, branch?: BranchDto) => {
    setDraft((prev) => ({ ...prev, salon, branch: branch || null }));
  };

  const setServices = (services: ServiceDto[]) => {
    setDraft((prev) => ({ ...prev, services }));
  };

  const setDateTimeSlot = (date: string, slot: AvailableTimeSlotDto) => {
    setDraft((prev) => ({ ...prev, selectedDate: date, selectedSlot: slot }));
  };

  const applyCoupon = async (code: string) => {
    if (!draft.salon || !draft.branch) return { success: false, message: 'Please select salon and branch' };
    try {
      const subtotal = draft.services.reduce((acc, s) => acc + s.basePrice, 0);
      const res = await promotionService.validateCoupon({
        code: code.toUpperCase(),
        salonId: draft.salon.id,
        branchId: draft.branch.id,
        bookingAmount: subtotal,
        serviceIds: draft.services.map((s) => s.id),
      });

      if (res.isValid) {
        setDraft((prev) => ({ ...prev, couponCode: code, appliedCoupon: res }));
        return { success: true, message: 'Coupon applied successfully!' };
      } else {
        return { success: false, message: res.message || 'Coupon is not eligible for this booking.' };
      }
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to validate coupon' };
    }
  };

  const removeCoupon = () => {
    setDraft((prev) => ({ ...prev, couponCode: undefined, appliedCoupon: null }));
  };

  const toggleWalletUsage = () => {
    setDraft((prev) => ({ ...prev, useWalletBalance: !prev.useWalletBalance }));
  };

  const acquireSlotLock = async (): Promise<boolean> => {
    if (!draft.branch || !draft.selectedSlot) return false;
    try {
      const lock = await customerBookingService.acquireReservationLock({
        branchId: draft.branch.id,
        slotDate: draft.selectedDate,
        startTime: draft.selectedSlot.startTime,
        endTime: draft.selectedSlot.endTime,
        staffId: draft.selectedSlot.staffId,
      });
      setDraft((prev) => ({ ...prev, lockKey: lock.lockKey }));
      return true;
    } catch (err) {
      console.error('Failed to acquire reservation lock:', err);
      return false;
    }
  };

  const releaseSlotLock = async () => {
    if (draft.lockKey) {
      try {
        await customerBookingService.releaseReservationLock(draft.lockKey);
      } catch {
        // Best-effort release
      } finally {
        setDraft((prev) => ({ ...prev, lockKey: undefined }));
      }
    }
  };

  const resetDraft = () => {
    setDraft(initialDraft);
  };

  const getPricingSummary = () => {
    const subtotal = draft.services.reduce((acc, s) => acc + s.basePrice, 0);
    const gstCalc = calculateGST(subtotal, 18);
    const discountAmount = draft.appliedCoupon?.discountAmount || 0;

    const netBeforeWallet = Math.max(0, gstCalc.totalAmount - discountAmount);
    const walletDebit = draft.useWalletBalance ? Math.min(netBeforeWallet, 150) : 0;
    const finalPayable = Math.max(0, netBeforeWallet - walletDebit);

    return {
      subtotal,
      gstAmount: gstCalc.gstAmount,
      discountAmount,
      walletDebit,
      finalPayable,
    };
  };

  return (
    <BookingFlowContext.Provider
      value={{
        draft,
        setSalonAndBranch,
        setServices,
        setDateTimeSlot,
        applyCoupon,
        removeCoupon,
        toggleWalletUsage,
        acquireSlotLock,
        releaseSlotLock,
        resetDraft,
        getPricingSummary,
      }}
    >
      {children}
    </BookingFlowContext.Provider>
  );
};

export const useBookingFlow = (): BookingFlowContextType => {
  const context = useContext(BookingFlowContext);
  if (!context) {
    throw new Error('useBookingFlow must be used within a BookingFlowProvider');
  }
  return context;
};
