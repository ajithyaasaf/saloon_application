import { primitivePalette, primitiveShadow } from '../primitives.js';
import { ThemeDefinition } from '../tokens.js';

export const luxuryNoirTheme: ThemeDefinition = {
  id: 'luxury-noir',
  name: 'Luxury Noir & Gold',
  appearance: 'dark',

  color: {
    background: {
      canvas: primitivePalette.neutralDark[950],   // #080A0C
      surface: primitivePalette.neutralDark[850],  // #121518
      elevated: primitivePalette.neutralDark[800], // #191C1F
      inset: primitivePalette.neutralDark[900],    // #0D0F11
      inverse: primitivePalette.neutralDark[50],   // #F8F9FA
      overlay: 'rgba(0, 0, 0, 0.78)',
    },
    text: {
      primary: primitivePalette.neutralDark[50],   // #F8F9FA (17.5:1 on canvas)
      secondary: primitivePalette.neutralDark[300],// #CED4DA (11.2:1 on surface)
      muted: primitivePalette.neutralDark[400],    // #9BA1A6 (6.4:1 on surface - WCAG AA Pass)
      inverse: primitivePalette.neutralDark[950],  // #080A0C
      disabled: primitivePalette.neutralDark[600], // #495057
    },
    border: {
      subtle: 'rgba(255, 255, 255, 0.05)',
      default: 'rgba(255, 255, 255, 0.08)',
      strong: 'rgba(255, 255, 255, 0.16)',
      focus: primitivePalette.primaryGold[400],    // #D4AF37
      error: primitivePalette.rose[400],           // #F87171
    },
    action: {
      primary: primitivePalette.primaryGold[400],     // #D4AF37
      primaryHover: primitivePalette.primaryGold[500],// #C59F2A
      primaryActive: primitivePalette.primaryGold[600],// #A6821E
      primarySubtle: 'rgba(212, 175, 55, 0.12)',
      secondary: 'rgba(255, 255, 255, 0.06)',
      secondaryHover: 'rgba(255, 255, 255, 0.10)',
      secondaryActive: 'rgba(255, 255, 255, 0.14)',
      ghostHover: 'rgba(255, 255, 255, 0.05)',
      ghostActive: 'rgba(255, 255, 255, 0.09)',
      destructive: primitivePalette.rose[500],
      destructiveHover: primitivePalette.rose[600],
      destructiveSubtle: primitivePalette.rose.subtleDark,
      disabled: 'rgba(255, 255, 255, 0.05)',
    },
    interactive: {
      hover: 'rgba(255, 255, 255, 0.04)',
      active: 'rgba(255, 255, 255, 0.07)',
      selected: 'rgba(212, 175, 55, 0.10)',
      focusRing: '0 0 0 2px rgba(212, 175, 55, 0.30)',
      disabled: 'rgba(255, 255, 255, 0.04)',
    },
    status: {
      success: primitivePalette.green[400],
      successSubtle: primitivePalette.green.subtleDark,
      successBorder: primitivePalette.green.borderDark,
      warning: primitivePalette.amber[400],
      warningSubtle: primitivePalette.amber.subtleDark,
      warningBorder: primitivePalette.amber.borderDark,
      error: primitivePalette.rose[400],
      errorSubtle: primitivePalette.rose.subtleDark,
      errorBorder: primitivePalette.rose.borderDark,
      info: primitivePalette.blue[400],
      infoSubtle: primitivePalette.blue.subtleDark,
      infoBorder: primitivePalette.blue.borderDark,
    },
  },

  typography: {
    display: {
      fontFamily: "'Outfit', sans-serif",
      fontSize: '2.25rem',
      fontWeight: 700,
      lineHeight: '1.15',
      letterSpacing: '-0.03em',
    },
    pageTitle: {
      fontFamily: "'Outfit', sans-serif",
      fontSize: '1.75rem',
      fontWeight: 700,
      lineHeight: '1.20',
      letterSpacing: '-0.02em',
    },
    sectionTitle: {
      fontFamily: "'Outfit', sans-serif",
      fontSize: '1.375rem',
      fontWeight: 600,
      lineHeight: '1.25',
      letterSpacing: '-0.015em',
    },
    cardTitle: {
      fontFamily: "'Outfit', sans-serif",
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: '1.30',
      letterSpacing: '-0.01em',
    },
    bodyLarge: {
      fontFamily: "'Inter', sans-serif",
      fontSize: '1.00rem',
      fontWeight: 400,
      lineHeight: '1.50',
      letterSpacing: '0.00em',
    },
    body: {
      fontFamily: "'Inter', sans-serif",
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: '1.50',
      letterSpacing: '0.00em',
    },
    bodySecondary: {
      fontFamily: "'Inter', sans-serif",
      fontSize: '0.8125rem',
      fontWeight: 400,
      lineHeight: '1.45',
      letterSpacing: '0.005em',
    },
    caption: {
      fontFamily: "'Inter', sans-serif",
      fontSize: '0.75rem',
      fontWeight: 500,
      lineHeight: '1.40',
      letterSpacing: '0.01em',
    },
    label: {
      fontFamily: "'Inter', sans-serif",
      fontSize: '0.75rem',
      fontWeight: 600,
      lineHeight: '1.20',
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
    },
    button: {
      fontFamily: "'Inter', sans-serif",
      fontSize: '0.875rem',
      fontWeight: 600,
      lineHeight: '1.00',
      letterSpacing: '0.01em',
    },
  },

  shadow: {
    none: primitiveShadow.none,
    sm: primitiveShadow.sm,
    md: primitiveShadow.md,
    lg: primitiveShadow.lg,
    focus: '0 0 0 2px rgba(212, 175, 55, 0.30)',
  },

  density: {
    compact: {
      tableCellPaddingY: '0.50rem',
      inputHeight: '34px',
      cardPadding: '1.00rem',
      buttonPaddingY: '0.375rem',
    },
    comfortable: {
      tableCellPaddingY: '0.875rem',
      inputHeight: '42px',
      cardPadding: '1.50rem',
      buttonPaddingY: '0.625rem',
    },
  },

  button: {
    primary: {
      background: primitivePalette.primaryGold[400],
      backgroundHover: primitivePalette.primaryGold[500],
      backgroundActive: primitivePalette.primaryGold[600],
      text: primitivePalette.neutralDark[950],
      border: 'transparent',
      shadow: '0 4px 14px rgba(212, 175, 55, 0.25)',
    },
    secondary: {
      background: 'rgba(255, 255, 255, 0.06)',
      backgroundHover: 'rgba(255, 255, 255, 0.10)',
      backgroundActive: 'rgba(255, 255, 255, 0.14)',
      text: primitivePalette.neutralDark[50],
      border: 'rgba(255, 255, 255, 0.08)',
    },
    ghost: {
      background: 'transparent',
      backgroundHover: 'rgba(255, 255, 255, 0.05)',
      backgroundActive: 'rgba(255, 255, 255, 0.09)',
      text: primitivePalette.neutralDark[300],
    },
    destructive: {
      background: primitivePalette.rose.subtleDark,
      backgroundHover: 'rgba(248, 113, 113, 0.20)',
      backgroundActive: 'rgba(248, 113, 113, 0.28)',
      text: primitivePalette.rose[400],
      border: primitivePalette.rose.borderDark,
    },
    disabled: {
      background: 'rgba(255, 255, 255, 0.04)',
      text: primitivePalette.neutralDark[600],
      border: 'rgba(255, 255, 255, 0.04)',
    },
  },

  input: {
    background: primitivePalette.neutralDark[900],
    text: primitivePalette.neutralDark[50],
    placeholder: primitivePalette.neutralDark[400],
    border: 'rgba(255, 255, 255, 0.08)',
    borderHover: 'rgba(255, 255, 255, 0.16)',
    borderFocus: primitivePalette.primaryGold[400],
    borderError: primitivePalette.rose[400],
    focusRing: '0 0 0 2px rgba(212, 175, 55, 0.25)',
    disabledBackground: 'rgba(255, 255, 255, 0.02)',
    disabledText: primitivePalette.neutralDark[600],
  },

  card: {
    background: primitivePalette.neutralDark[850],
    border: 'rgba(255, 255, 255, 0.07)',
    borderHover: 'rgba(255, 255, 255, 0.15)',
    shadow: primitiveShadow.sm,
    radius: '12px',
  },

  badge: {
    success: {
      background: primitivePalette.green.subtleDark,
      text: primitivePalette.green[400],
      border: primitivePalette.green.borderDark,
    },
    warning: {
      background: primitivePalette.amber.subtleDark,
      text: primitivePalette.amber[400],
      border: primitivePalette.amber.borderDark,
    },
    error: {
      background: primitivePalette.rose.subtleDark,
      text: primitivePalette.rose[400],
      border: primitivePalette.rose.borderDark,
    },
    info: {
      background: primitivePalette.blue.subtleDark,
      text: primitivePalette.blue[400],
      border: primitivePalette.blue.borderDark,
    },
    neutral: {
      background: 'rgba(255, 255, 255, 0.06)',
      text: primitivePalette.neutralDark[300],
      border: 'rgba(255, 255, 255, 0.08)',
    },
    primary: {
      background: 'rgba(212, 175, 55, 0.12)',
      text: primitivePalette.primaryGold[300],
      border: 'rgba(212, 175, 55, 0.30)',
    },
  },

  table: {
    header: {
      background: primitivePalette.neutralDark[900],
      text: primitivePalette.neutralDark[300],
      border: 'rgba(255, 255, 255, 0.06)',
    },
    row: {
      background: primitivePalette.neutralDark[850],
      backgroundHover: 'rgba(255, 255, 255, 0.03)',
      backgroundSelected: 'rgba(212, 175, 55, 0.08)',
      border: 'rgba(255, 255, 255, 0.05)',
      text: primitivePalette.neutralDark[50],
    },
  },

  modal: {
    background: primitivePalette.neutralDark[800],
    overlay: 'rgba(0, 0, 0, 0.78)',
    border: 'rgba(255, 255, 255, 0.12)',
    shadow: primitiveShadow.lg,
    radius: '14px',
  },

  drawer: {
    background: primitivePalette.neutralDark[800],
    border: 'rgba(255, 255, 255, 0.08)',
    shadow: primitiveShadow.lg,
  },

  sidebar: {
    background: primitivePalette.neutralDark[850],
    border: 'rgba(255, 255, 255, 0.06)',
    item: {
      backgroundHover: 'rgba(255, 255, 255, 0.04)',
      backgroundActive: 'rgba(212, 175, 55, 0.12)',
      text: primitivePalette.neutralDark[300],
      textActive: primitivePalette.primaryGold[400],
      borderActive: primitivePalette.primaryGold[400],
    },
  },

  header: {
    background: 'rgba(18, 21, 24, 0.88)',
    border: 'rgba(255, 255, 255, 0.06)',
    text: primitivePalette.neutralDark[50],
  },

  navigation: {
    background: primitivePalette.neutralDark[850],
    itemActive: primitivePalette.primaryGold[400],
    itemHover: 'rgba(255, 255, 255, 0.04)',
    itemInactive: primitivePalette.neutralDark[400],
    border: 'rgba(255, 255, 255, 0.06)',
  },
};
