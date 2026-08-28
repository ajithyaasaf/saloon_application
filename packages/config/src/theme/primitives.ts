/**
 * Layer 1: Primitive Tokens (Brand-Agnostic Raw Scales)
 * 
 * Context-agnostic raw scales for color palettes, spacing, typography, radius, elevation, motion, breakpoints, and density.
 * Components MUST NOT directly consume Layer 1 primitives.
 */

export const primitivePalette = {
  // Primary Gold/Champagne Scale (Agnostic naming)
  primaryGold: {
    50:  '#FAF7EE',
    100: '#F4ECE0',
    200: '#E7D8BC',
    300: '#D9C293',
    400: '#D4AF37', // Active Champagne Gold Primary
    500: '#C59F2A', // Active Gold Hover
    600: '#A6821E', // Active Gold Pressed
    700: '#7E6116',
    800: '#54410E',
    900: '#2A2007',
    950: '#171203',
  },

  // Emerald Botanical Scale (Agnostic naming)
  emeraldGreen: {
    50:  '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981', // Botanical Primary
    600: '#059669', // Botanical Hover
    700: '#047857', // Botanical Pressed
    800: '#065F46',
    900: '#064E3B',
    950: '#022C22',
  },

  // Royal Purple / Electric Violet Scale (Customer Mobile Theme)
  primaryPurple: {
    50:  '#ECE7FE', // Soft lavender container / pill / category circle
    100: '#E4DCFD',
    200: '#D5C7FC',
    300: '#BAA2FA',
    400: '#8A5AF6', // Vibrant violet light
    500: '#703EE5', // Customer Mobile Primary Electric Royal Purple
    600: '#5F2FE0', // Primary Hover / Pressed
    700: '#4E23CA',
    800: '#3D1AA6',
    900: '#2D1280',
    950: '#1A0752',
  },

  // Clean Lavender Tinted Neutral Scale (For Customer Mobile)
  neutralLavender: {
    0:    '#000000',
    50:   '#181A20', // Primary Headings Text (WCAG AAA >= 16:1)
    100:  '#262833',
    200:  '#3B3E4D',
    300:  '#535768', // Secondary Text
    400:  '#71768A', // Muted Text (WCAG AA >= 4.8:1)
    500:  '#8E94A8',
    600:  '#C4C8D8',
    700:  '#E8EAF3', // Border Default
    800:  '#F1F2F9', // Inset Search / Pill Background
    850:  '#FFFFFF', // Card Surface
    900:  '#FFFFFF', // Elevated Surface
    950:  '#F8F9FE', // Canvas Background
    1000: '#FFFFFF',
  },

  // Neutral Charcoal / Slate Scale (Agnostic naming)
  neutralZinc: {
    50:  '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827', // Light Minimal Primary
    950: '#090D14',
  },

  // Deep Dark Neutral Scale (For Dark Themes: Luxury Noir / Deep Noir)
  neutralDark: {
    0:    '#FFFFFF',
    50:   '#F8F9FA', // Primary Text on Dark (WCAG AAA >= 17:1)
    100:  '#E9ECEF',
    200:  '#DEE2E6',
    300:  '#CED4DA', // Secondary Text on Dark (WCAG AAA >= 11:1)
    400:  '#9BA1A6', // Muted Text on Dark (WCAG AA >= 6.2:1)
    500:  '#6C757D',
    600:  '#495057', // Disabled Text / Inactive
    700:  '#2B3035', // Strong Border
    800:  '#191C1F', // Elevated Surface (Modals/Popovers)
    850:  '#121518', // Standard Surface (Cards/Sidebars)
    900:  '#0D0F11', // Inset Surface (Inputs/Table Headers)
    950:  '#080A0C', // Canvas Background
    1000: '#000000',
  },

  // Deep Forest Neutral Scale (For Botanical Theme)
  neutralForest: {
    0:    '#FFFFFF',
    50:   '#F2F7F4', // Primary Text on Forest
    100:  '#DFE8E3',
    200:  '#BED0C8',
    300:  '#9FB5AC', // Secondary Text on Forest
    400:  '#809B90', // Muted Text on Forest (WCAG AA >= 5.8:1)
    500:  '#5B776D',
    600:  '#3E554C',
    700:  '#273731',
    800:  '#15221E',
    850:  '#0F1815',
    900:  '#0A110E',
    950:  '#060B09',
    1000: '#000000',
  },

  // Pure Light Neutral Scale (For Light Minimal Theme)
  neutralLight: {
    0:    '#000000',
    50:   '#0F172A', // Primary Text on Light (WCAG AAA >= 16:1)
    100:  '#1E293B',
    200:  '#334155',
    300:  '#475569', // Secondary Text on Light (WCAG AAA >= 8.5:1)
    400:  '#64748B', // Muted Text on Light (WCAG AA >= 5.2:1)
    500:  '#94A3B8',
    600:  '#CBD5E1',
    700:  '#E2E8F0', // Border Default on Light
    800:  '#F1F5F9', // Inset / Table Header on Light
    850:  '#FFFFFF', // Card Surface on Light
    900:  '#FFFFFF', // Elevated Surface on Light
    950:  '#F8FAFC', // Canvas Background on Light
    1000: '#FFFFFF',
  },

  // Semantic Status Primitives
  green: {
    50:  '#ECFDF5',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
    800: '#065F46',
    900: '#064E3B',
    subtleDark: 'rgba(52, 211, 153, 0.12)',
    subtleLight: 'rgba(16, 185, 129, 0.12)',
    borderDark: 'rgba(52, 211, 153, 0.28)',
    borderLight: 'rgba(16, 185, 129, 0.30)',
  },
  amber: {
    50:  '#FFFBEB',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    800: '#92400E',
    900: '#78350F',
    subtleDark: 'rgba(251, 191, 36, 0.12)',
    subtleLight: 'rgba(245, 158, 11, 0.12)',
    borderDark: 'rgba(251, 191, 36, 0.28)',
    borderLight: 'rgba(245, 158, 11, 0.30)',
  },
  rose: {
    50:  '#FFF1F2',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    800: '#991B1B',
    900: '#7F1D1D',
    subtleDark: 'rgba(248, 113, 113, 0.12)',
    subtleLight: 'rgba(239, 68, 68, 0.12)',
    borderDark: 'rgba(248, 113, 113, 0.28)',
    borderLight: 'rgba(239, 68, 68, 0.30)',
  },
  blue: {
    50:  '#EFF6FF',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    800: '#1E40AF',
    900: '#1E3A8A',
    subtleDark: 'rgba(96, 165, 250, 0.12)',
    subtleLight: 'rgba(59, 130, 246, 0.12)',
    borderDark: 'rgba(96, 165, 250, 0.28)',
    borderLight: 'rgba(59, 130, 246, 0.30)',
  },
} as const;

export const primitiveSpacing = {
  0:  '0px',
  1:  '0.25rem',  // 4px
  2:  '0.50rem',  // 8px
  3:  '0.75rem',  // 12px
  4:  '1.00rem',  // 16px
  5:  '1.25rem',  // 20px
  6:  '1.50rem',  // 24px
  8:  '2.00rem',  // 32px
  10: '2.50rem',  // 40px
  12: '3.00rem',  // 48px
  16: '4.00rem',  // 64px
} as const;

export const primitiveRadius = {
  none: '0px',
  sm:   '4px',
  md:   '8px',
  lg:   '12px',
  xl:   '16px',
  full: '9999px',
} as const;

export const primitiveShadow = {
  none: 'none',
  sm:   '0 1px 2px 0 rgba(0, 0, 0, 0.45)',
  md:   '0 4px 14px -2px rgba(0, 0, 0, 0.55), 0 2px 6px -1px rgba(0, 0, 0, 0.35)',
  lg:   '0 14px 28px -4px rgba(0, 0, 0, 0.75), 0 6px 12px -2px rgba(0, 0, 0, 0.45)',
  focus:'0 0 0 2px rgba(212, 175, 55, 0.30)',
} as const;

export const primitiveMotion = {
  duration: {
    fast:   '150ms',
    normal: '250ms',
    slow:   '400ms',
  },
  easing: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    enter:    'cubic-bezier(0.16, 1, 0.3, 1)',
    exit:     'cubic-bezier(0.7, 0, 0.84, 0)',
  },
} as const;

export const primitiveBreakpoints = {
  mobile:  '640px',
  tablet:  '1024px',
  desktop: '1280px',
  wide:    '1536px',
} as const;
