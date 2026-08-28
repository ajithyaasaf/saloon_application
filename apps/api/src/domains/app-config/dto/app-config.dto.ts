import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum AppPlatform {
  ANDROID = 'android',
  IOS = 'ios',
  WEB = 'web',
}

export enum UpdateMode {
  NONE = 'NONE',
  RECOMMENDED = 'RECOMMENDED',
  MANDATORY = 'MANDATORY',
}

export class AppConfigQueryDto {
  @IsOptional()
  @IsEnum(AppPlatform)
  platform?: AppPlatform;

  @IsOptional()
  @IsString()
  appVersion?: string;

  @IsOptional()
  @IsString()
  buildNumber?: string;
}

export interface AppVersionPolicyDto {
  minimumSupportedVersion: string;
  recommendedVersion: string;
  latestVersion: string;
}

export interface AppUpdateActionDto {
  mode: UpdateMode;
  title: string;
  message: string;
  storeUrl: string;
  releaseNotesUrl?: string;
}

export interface AppFeatureFlagsDto {
  newBookingFlow: boolean;
  walletCashback: boolean;
  homePromotions: boolean;
  chatSupport: boolean;
}

export interface AppEmergencyControlsDto {
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  disablePayments: boolean;
  disableBookings: boolean;
}

export interface AppConfigResponseDto {
  platform: AppPlatform;
  app: AppVersionPolicyDto;
  update: AppUpdateActionDto;
  features: AppFeatureFlagsDto;
  emergency: AppEmergencyControlsDto;
  configVersion: number;
  ttlSeconds: number;
}
