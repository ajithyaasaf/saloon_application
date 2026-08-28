import { primitivePalette, primitiveShadow } from '../primitives.js';
import { ThemeDefinition } from '../tokens.js';

export const customerPurpleTheme: ThemeDefinition = {
  id: 'customer-purple',
  name: 'Royal Purple & Soft Lavender',
  appearance: 'light',

  color: {
    background: {
      canvas: primitivePalette.neutralLavender[950],   // #F8F9FE (Crisp soft canvas)
      surface: primitivePalette.neutralLavender[850],  // #FFFFFF (White cards)
      elevated: primitivePalette.neutralLavender[900], // #FFFFFF (Modals / Popovers)
      inset: primitivePalette.neutralLavender[800],    // #F1F2F9 (Pills / Search bar)
      inverse: primitivePalette.neutralLavender[50],   // #181A20
      overlay: 'rgba(21, 6, 52, 0.48)',
    },
    text: {
      primary: primitivePalette.neutralLavender[50],   // #181A20 (WCAG AAA >= 16:1)
      secondary: primitivePalette.neutralLavender[300],// #535768 (WCAG AAA >= 7.8:1)
      muted: primitivePalette.neutralLavender[400],    // #71768A (WCAG AA >= 4.8:1)
      inverse: '#FFFFFF',
      disabled: primitivePalette.neutralLavender[600], // #C4C8D8
    },
    border: {
      subtle: 'rgba(108, 62, 232, 0.06)',
      default: primitivePalette.neutralLavender[700], // #E8EAF3
      strong: primitivePalette.neutralLavender[600],  // #C4C8D8
      focus: primitivePalette.primaryPurple[500],     // #6C3EE8
      error: primitivePalette.rose[500],              // #EF4444
    },
    action: {
      primary: primitivePalette.primaryPurple[500],     // #6C3EE8
      primaryHover: primitivePalette.primaryPurple[600],// #5925DC
      primaryActive: primitivePalette.primaryPurple[700],// #471CA9
      primarySubtle: primitivePalette.primaryPurple[50],// #F4F0FF
      secondary: primitivePalette.neutralLavender[800],
      secondaryHover: primitivePalette.neutralLavender[700],
      secondaryActive: primitivePalette.neutralLavender[600],
      ghostHover: 'rgba(108, 62, 232, 0.06)',
      ghostActive: 'rgba(108, 62, 232, 0.12)',
      destructive: primitivePalette.rose[500],
      destructiveHover: primitivePalette.rose[600],
      destructiveSubtle: primitivePalette.rose.subtleLight,
      disabled: 'rgba(108, 62, 232, 0.08)',
    },
    interactive: {
      hover: 'rgba(108, 62, 232, 0.04)',
      active: 'rgba(108, 62, 232, 0.08)',
      selected: 'rgba(108, 62, 232, 0.10)',
      focusRing: '0 0 0 2px rgba(108, 62, 232, 0.25)',
      disabled: 'rgba(0, 0, 0, 0.04)',
    },
    status: {
      success: primitivePalette.green[600],
      successSubtle: primitivePalette.green.subtleLight,
      successBorder: primitivePalette.green.borderLight,
      warning: primitivePalette.amber[600],
      warningSubtle: primitivePalette.amber.subtleLight,
      warningBorder: primitivePalette.amber.borderLight,
      error: primitivePalette.rose[600],
      errorSubtle: primitivePalette.rose.subtleLight,
      errorBorder: primitivePalette.rose.borderLight,
      info: primitivePalette.primaryPurple[500],
      infoSubtle: primitivePalette.primaryPurple[50],
      infoBorder: primitivePalette.primaryPurple[200],
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
      fontFamily: "'Outfit', sans-serif",
      fontSize: '0.875rem',
      fontWeight: 600,
      lineHeight: '1.00',
      letterSpacing: '0.01em',
    },
  },

  shadow: {
    none: primitiveShadow.none,
    sm: primitiveShadow.sm,
    md: '0 4px 16px rgba(108, 62, 232, 0.08)',
    lg: '0 10px 30px rgba(108, 62, 232, 0.12)',
    focus: '0 0 0 2px rgba(108, 62, 232, 0.25)',
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
      background: primitivePalette.primaryPurple[500],
      backgroundHover: primitivePalette.primaryPurple[600],
      backgroundActive: primitivePalette.primaryPurple[700],
      text: '#FFFFFF',
      border: 'transparent',
      shadow: '0 4px 14px rgba(108, 62, 232, 0.28)',
    },
    secondary: {
      background: primitivePalette.primaryPurple[50],
      backgroundHover: primitivePalette.primaryPurple[100],
      backgroundActive: primitivePalette.primaryPurple[200],
      text: primitivePalette.primaryPurple[600],
      border: '1px solid ' + primitivePalette.primaryPurple[200],
    },
    ghost: {
      background: 'transparent',
      backgroundHover: 'rgba(108, 62, 232, 0.06)',
      backgroundActive: 'rgba(108, 62, 232, 0.12)',
      text: primitivePalette.primaryPurple[600],
    },
    destructive: {
      background: primitivePalette.rose.subtleLight,
      backgroundHover: 'rgba(239, 68, 68, 0.20)',
      backgroundActive: 'rgba(239, 68, 68, 0.28)',
      text: primitivePalette.rose[600],
      border: primitivePalette.rose.borderLight,
    },
    disabled: {
      background: 'rgba(108, 62, 232, 0.05)',
      text: primitivePalette.neutralLavender[400],
      border: '1px solid ' + primitivePalette.neutralLavender[700],
    },
  },

  input: {
    background: primitivePalette.neutralLavender[800],
    text: primitivePalette.neutralLavender[50],
    placeholder: primitivePalette.neutralLavender[400],
    border: primitivePalette.neutralLavender[700],
    borderHover: primitivePalette.primaryPurple[300],
    borderFocus: primitivePalette.primaryPurple[500],
    borderError: primitivePalette.rose[500],
    focusRing: '0 0 0 2px rgba(108, 62, 232, 0.25)',
    disabledBackground: 'rgba(0, 0, 0, 0.04)',
    disabledText: primitivePalette.neutralLavender[400],
  },

  card: {
    background: primitivePalette.neutralLavender[850],
    border: primitivePalette.neutralLavender[700],
    borderHover: primitivePalette.primaryPurple[300],
    shadow: '0 4px 16px rgba(108, 62, 232, 0.06)',
    radius: '14px',
  },

  badge: {
    success: {
      background: primitivePalette.green.subtleLight,
      text: primitivePalette.green[600],
      border: primitivePalette.green.borderLight,
    },
    warning: {
      background: primitivePalette.amber.subtleLight,
      text: primitivePalette.amber[600],
      border: primitivePalette.amber.borderLight,
    },
    error: {
      background: primitivePalette.rose.subtleLight,
      text: primitivePalette.rose[600],
      border: primitivePalette.rose.borderLight,
    },
    info: {
      background: primitivePalette.primaryPurple[50],
      text: primitivePalette.primaryPurple[600],
      border: primitivePalette.primaryPurple[200],
    },
    neutral: {
      background: primitivePalette.neutralLavender[800],
      text: primitivePalette.neutralLavender[300],
      border: primitivePalette.neutralLavender[700],
    },
    primary: {
      background: primitivePalette.primaryPurple[50],
      text: primitivePalette.primaryPurple[600],
      border: primitivePalette.primaryPurple[200],
    },
  },

  table: {
    header: {
      background: primitivePalette.neutralLavender[800],
      text: primitivePalette.neutralLavender[300],
      border: primitivePalette.neutralLavender[700],
    },
    row: {
      background: primitivePalette.neutralLavender[850],
      backgroundHover: 'rgba(108, 62, 232, 0.03)',
      backgroundSelected: 'rgba(108, 62, 232, 0.08)',
      border: primitivePalette.neutralLavender[700],
      text: primitivePalette.neutralLavender[50],
    },
  },

  modal: {
    background: primitivePalette.neutralLavender[850],
    overlay: 'rgba(21, 6, 52, 0.48)',
    border: primitivePalette.neutralLavender[700],
    shadow: primitiveShadow.lg,
    radius: '16px',
  },

  drawer: {
    background: primitivePalette.neutralLavender[850],
    border: primitivePalette.neutralLavender[700],
    shadow: primitiveShadow.lg,
  },

  sidebar: {
    background: primitivePalette.neutralLavender[850],
    border: primitivePalette.neutralLavender[700],
    item: {
      backgroundHover: 'rgba(108, 62, 232, 0.04)',
      backgroundActive: primitivePalette.primaryPurple[50],
      text: primitivePalette.neutralLavender[300],
      textActive: primitivePalette.primaryPurple[600],
      borderActive: primitivePalette.primaryPurple[500],
    },
  },

  header: {
    background: 'rgba(255, 255, 255, 0.95)',
    border: primitivePalette.neutralLavender[700],
    text: primitivePalette.neutralLavender[50],
  },

  navigation: {
    background: '#FFFFFF',
    itemActive: primitivePalette.primaryPurple[500],
    itemHover: 'rgba(108, 62, 232, 0.04)',
    itemInactive: primitivePalette.neutralLavender[400],
    border: primitivePalette.neutralLavender[700],
  },
};
