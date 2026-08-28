import {
  customerPurpleTheme,
  luxuryNoirTheme,
  botanicalTheme,
  lightMinimalTheme,
  adaptThemeForMobile,
  MobileThemeTokens,
} from '@saloon/config';

export const mobileCustomerPurpleTheme: MobileThemeTokens = adaptThemeForMobile(customerPurpleTheme);
export const mobileLuxuryNoirTheme: MobileThemeTokens = adaptThemeForMobile(luxuryNoirTheme);
export const mobileBotanicalTheme: MobileThemeTokens = adaptThemeForMobile(botanicalTheme);
export const mobileLightMinimalTheme: MobileThemeTokens = adaptThemeForMobile(lightMinimalTheme);

export const mobileThemes: Record<string, MobileThemeTokens> = {
  'customer-purple': mobileCustomerPurpleTheme,
  'luxury-noir': mobileLuxuryNoirTheme,
  botanical: mobileBotanicalTheme,
  'light-minimal': mobileLightMinimalTheme,
};

export const defaultMobileTheme: MobileThemeTokens = mobileCustomerPurpleTheme;

