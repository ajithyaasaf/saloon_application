import { DayOfWeek, LeaveStatus, LeaveType, StaffStatus, UserRole } from '../../enums/index.js';

export interface StaffShiftDto {
  id: string;
  staffId: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // "09:00"
  endTime: string; // "18:00"
  isWorkingDay: boolean;
  breakStartTime?: string | null;
  breakEndTime?: string | null;
}

export interface StaffLeaveDto {
  id: string;
  staffId: string;
  staffName?: string;
  startDate: string;
  endDate: string;
  leaveType: LeaveType;
  status: LeaveStatus;
  reason?: string | null;
  reviewedByUserId?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

export interface StaffBranchAssignmentDto {
  id: string;
  staffId: string;
  branchId: string;
  branchName?: string;
  isPrimary: boolean;
  joinedAt: string;
}

export interface StaffMemberDto {
  id: string;
  userId: string;
  salonId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  role: UserRole;
  status: StaffStatus;
  title?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  commissionRate?: number | null;
  servicesProvided?: string[]; // serviceIds
  assignedBranches?: StaffBranchAssignmentDto[];
  shifts?: StaffShiftDto[];
  leaves?: StaffLeaveDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateStaffRequestDto {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  password?: string;
  title?: string;
  bio?: string;
  avatarMediaId?: string;
  commissionRate?: number;
  primaryBranchId: string;
  serviceIds?: string[];
}

export interface UpdateStaffRequestDto {
  firstName?: string;
  lastName?: string;
  title?: string;
  bio?: string;
  avatarMediaId?: string;
  commissionRate?: number;
  status?: StaffStatus;
  serviceIds?: string[];
}

export interface ConfigureStaffShiftsRequestDto {
  shifts: {
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    isWorkingDay: boolean;
    breakStartTime?: string | null;
    breakEndTime?: string | null;
  }[];
}

export interface RequestStaffLeaveDto {
  startDate: string;
  endDate: string;
  leaveType: LeaveType;
  reason?: string;
}

export interface ReviewStaffLeaveDto {
  status: LeaveStatus.APPROVED | LeaveStatus.REJECTED;
  reviewNotes?: string;
}

export interface StaffBreakDto {
  startTime: string;
  endTime: string;
  description?: string;
}
