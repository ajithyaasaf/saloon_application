export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Welcome: undefined;
  PhoneLogin: undefined;
  OtpVerification: undefined;
};

export type MainTabParamList = {
  ExploreTab: undefined;
  BookingsTab: undefined;
  WalletTab: undefined;
  ProfileTab: undefined;
};

export type ExploreStackParamList = {
  Home: undefined;
  Search: undefined;
  SalonDetail: { salonId: string };
  ServiceMenu: { salonId: string; branchId?: string };
};

export type BookingsStackParamList = {
  MyBookings: undefined;
  BookingDetail: { bookingId: string };
};

export type WalletStackParamList = {
  WalletHome: undefined;
  LoyaltyLedger: undefined;
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  EditProfile: undefined;
  Membership: undefined;
  Referral: undefined;
  Notifications: undefined;
  Settings: undefined;
};
