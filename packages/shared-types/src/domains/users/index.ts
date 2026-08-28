import { Gender, UserRole } from '../../enums/index.js';

export interface AvatarDto {
  url: string;
  thumbnailUrl?: string | null;
}

export interface UserProfileDto {
  id: string;
  phone?: string | null;
  phoneVerified: boolean;
  email?: string | null;
  emailVerified: boolean;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  gender?: Gender | null;
  dateOfBirth?: string | null;
  preferredLanguage?: string | null;
  timezone?: string | null;
  marketingOptIn: boolean;
  role: UserRole;
  isActive: boolean;
  avatar?: AvatarDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserProfileDto {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  gender?: Gender;
  dateOfBirth?: string;
}

export interface UpdateUserPreferencesDto {
  preferredLanguage?: string;
  timezone?: string;
  marketingOptIn?: boolean;
}

export interface RequestEmailChangeDto {
  newEmail: string;
}

export interface ConfirmEmailChangeDto {
  token: string;
}

export interface RequestPhoneChangeDto {
  newPhone: string;
}

export interface ConfirmPhoneChangeDto {
  newPhone: string;
  otp: string;
}

export interface AdminUpdateUserDto {
  role?: UserRole;
  isActive?: boolean;
  firstName?: string;
  lastName?: string;
}

export type CurrentUserProfileDto = UserProfileDto;
export type NotificationPreferencesDto = UpdateUserPreferencesDto;
