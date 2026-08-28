import { ThemeDefinition } from './tokens.js';

export interface MobileThemeTokens {
  id: string;
  name: string;
  appearance: 'dark' | 'light';
  colors: {
    // Canvas & Surfaces
    background: string;
    backgroundElevated: string;
    surface: string;
    surfaceSubtle: string;
    surfaceGlass: string;
    surfaceInset: string;

    // Actions & Highlights
    primary: string;
    primaryDark: string;
    primaryLight: string;
    primaryMuted: string;

    secondary: string;
    secondaryDark: string;
    secondaryMuted: string;

    // Status
    success: string;
    successMuted: string;
    successBorder: string;

    warning: string;
    warningMuted: string;
    warningBorder: string;

    danger: string;
    dangerMuted: string;
    dangerBorder: string;

    info: string;
    infoMuted: string;
    infoBorder: string;

    // Text
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    textAccent: string;
    textInverse: string;

    // Borders
    border: string;
    borderAccent: string;
    borderHighlight: string;

    // Component token aliases
    button: {
      primaryBg: string;
      primaryText: string;
      primaryPressed: string;
      secondaryBg: string;
      secondaryText: string;
      secondaryBorder: string;
    };
    card: {
      bg: string;
      border: string;
    };
    input: {
      bg: string;
      border: string;
      borderFocus: string;
      text: string;
      placeholder: string;
    };
    tabBar: {
      bg: string;
      border: string;
      active: string;
      inactive: string;
    };
  };
  typography: {
    display: { fontSize: number; lineHeight: number; fontWeight: '700'; letterSpacing: number };
    heading1: { fontSize: number; lineHeight: number; fontWeight: '700'; letterSpacing: number };
    heading2: { fontSize: number; lineHeight: number; fontWeight: '600'; letterSpacing: number };
    body: { fontSize: number; lineHeight: number; fontWeight: '400' };
    bodyBold: { fontSize: number; lineHeight: number; fontWeight: '600' };
    caption: { fontSize: number; lineHeight: number; fontWeight: '500' };
    micro: { fontSize: number; lineHeight: number; fontWeight: '600' };
  };
  spacing: {
    none: number;
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    xxxl: number;
    huge: number;
  };
  borderRadius: {
    none: number;
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
  touchTarget: {
    min: number;
    comfort: number;
  };
}

export function adaptThemeForMobile(theme: ThemeDefinition): MobileThemeTokens {
  return {
    id: theme.id,
    name: theme.name,
    appearance: theme.appearance,
    colors: {
      background: theme.color.background.canvas,
      backgroundElevated: theme.color.background.elevated,
      surface: theme.color.background.surface,
      surfaceSubtle: theme.color.interactive.hover,
      surfaceGlass: theme.header.background,
      surfaceInset: theme.color.background.inset,

      primary: theme.color.action.primary,
      primaryDark: theme.color.action.primaryHover,
      primaryLight: theme.badge.primary.text,
      primaryMuted: theme.color.action.primarySubtle,

      secondary: theme.color.action.secondary,
      secondaryDark: theme.color.action.secondaryHover,
      secondaryMuted: theme.badge.neutral.background,

      success: theme.color.status.success,
      successMuted: theme.color.status.successSubtle,
      successBorder: theme.color.status.successBorder,

      warning: theme.color.status.warning,
      warningMuted: theme.color.status.warningSubtle,
      warningBorder: theme.color.status.warningBorder,

      danger: theme.color.status.error,
      dangerMuted: theme.color.status.errorSubtle,
      dangerBorder: theme.color.status.errorBorder,

      info: theme.color.status.info,
      infoMuted: theme.color.status.infoSubtle,
      infoBorder: theme.color.status.infoBorder,

      textPrimary: theme.color.text.primary,
      textSecondary: theme.color.text.secondary,
      textMuted: theme.color.text.muted,
      textAccent: theme.color.action.primary,
      textInverse: theme.color.text.inverse,

      border: theme.color.border.default,
      borderAccent: theme.color.border.focus,
      borderHighlight: theme.color.border.strong,

      button: {
        primaryBg: theme.button.primary.background,
        primaryText: theme.button.primary.text,
        primaryPressed: theme.button.primary.backgroundHover,
        secondaryBg: theme.button.secondary.background,
        secondaryText: theme.button.secondary.text,
        secondaryBorder: theme.button.secondary.border,
      },
      card: {
        bg: theme.card.background,
        border: theme.card.border,
      },
      input: {
        bg: theme.input.background,
        border: theme.input.border,
        borderFocus: theme.input.borderFocus,
        text: theme.input.text,
        placeholder: theme.input.placeholder,
      },
      tabBar: {
        bg: theme.navigation.background,
        border: theme.navigation.border,
        active: theme.navigation.itemActive,
        inactive: theme.navigation.itemInactive,
      },
    },
    typography: {
      display: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.5 },
      heading1: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.3 },
      heading2: { fontSize: 18, lineHeight: 24, fontWeight: '600', letterSpacing: -0.2 },
      body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
      bodyBold: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
      caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
      micro: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
    },
    spacing: {
      none: 0,
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
      xl: 20,
      xxl: 24,
      xxxl: 32,
      huge: 40,
    },
    borderRadius: {
      none: 0,
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
      xl: 20,
      full: 9999,
    },
    touchTarget: {
      min: 44,
      comfort: 48,
    },
  };
}
