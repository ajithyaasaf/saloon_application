import { primitivePalette, primitiveShadow } from '../primitives.js';
import { ThemeDefinition } from '../tokens.js';

export const lightMinimalTheme: ThemeDefinition = {
  id: 'light-minimal',
  name: 'Light Minimal / Ivory',
  appearance: 'light',

  color: {
    background: {
      canvas: primitivePalette.neutralLight[950],   // #F8FAFC
      surface: primitivePalette.neutralLight[850],  // #FFFFFF
      elevated: primitivePalette.neutralLight[900], // #FFFFFF
      inset: primitivePalette.neutralLight[800],    // #F1F5F9
      inverse: primitivePalette.neutralLight[50],   // #0F172A
      overlay: 'rgba(15, 23, 42, 0.45)',
    },
    text: {
      primary: primitivePalette.neutralLight[50],   // #0F172A (16.5:1 on canvas)
      secondary: primitivePalette.neutralLight[300],// #475569 (8.6:1 on surface)
      muted: primitivePalette.neutralLight[400],    // #64748B (5.3:1 on surface - WCAG AA Pass)
      inverse: '#FFFFFF',
      disabled: primitivePalette.neutralLight[500], // #94A3B8
    },
    border: {
      subtle: 'rgba(0, 0, 0, 0.05)',
      default: primitivePalette.neutralLight[700], // #E2E8F0
      strong: primitivePalette.neutralLight[600],  // #CBD5E1
      focus: primitivePalette.neutralZinc[900],    // #111827
      error: primitivePalette.rose[500],
    },
    action: {
      primary: primitivePalette.neutralZinc[900],     // #111827
      primaryHover: primitivePalette.neutralZinc[800],// #1F2937
      primaryActive: primitivePalette.neutralZinc[700],// #374151
      primarySubtle: 'rgba(17, 24, 39, 0.06)',
      secondary: primitivePalette.neutralLight[800],
      secondaryHover: primitivePalette.neutralLight[700],
      secondaryActive: primitivePalette.neutralLight[600],
      ghostHover: 'rgba(0, 0, 0, 0.04)',
      ghostActive: 'rgba(0, 0, 0, 0.08)',
      destructive: primitivePalette.rose[500],
      destructiveHover: primitivePalette.rose[600],
      destructiveSubtle: primitivePalette.rose.subtleLight,
      disabled: 'rgba(0, 0, 0, 0.05)',
    },
    interactive: {
      hover: 'rgba(0, 0, 0, 0.03)',
      active: 'rgba(0, 0, 0, 0.06)',
      selected: 'rgba(17, 24, 39, 0.06)',
      focusRing: '0 0 0 2px rgba(17, 24, 39, 0.20)',
      disabled: 'rgba(0, 0, 0, 0.03)',
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
      info: primitivePalette.blue[600],
      infoSubtle: primitivePalette.blue.subtleLight,
      infoBorder: primitivePalette.blue.borderLight,
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
    none: 'none',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.08)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
    focus: '0 0 0 2px rgba(17, 24, 39, 0.20)',
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
      background: primitivePalette.neutralZinc[900],
      backgroundHover: primitivePalette.neutralZinc[800],
      backgroundActive: primitivePalette.neutralZinc[700],
      text: '#FFFFFF',
      border: 'transparent',
      shadow: '0 2px 6px rgba(17, 24, 39, 0.18)',
    },
    secondary: {
      background: '#FFFFFF',
      backgroundHover: primitivePalette.neutralLight[800],
      backgroundActive: primitivePalette.neutralLight[700],
      text: primitivePalette.neutralLight[50],
      border: primitivePalette.neutralLight[700],
    },
    ghost: {
      background: 'transparent',
      backgroundHover: 'rgba(0, 0, 0, 0.04)',
      backgroundActive: 'rgba(0, 0, 0, 0.08)',
      text: primitivePalette.neutralLight[300],
    },
    destructive: {
      background: primitivePalette.rose.subtleLight,
      backgroundHover: 'rgba(239, 68, 68, 0.20)',
      backgroundActive: 'rgba(239, 68, 68, 0.28)',
      text: primitivePalette.rose[600],
      border: primitivePalette.rose.borderLight,
    },
    disabled: {
      background: 'rgba(0, 0, 0, 0.04)',
      text: primitivePalette.neutralLight[500],
      border: 'rgba(0, 0, 0, 0.06)',
    },
  },

  input: {
    background: '#FFFFFF',
    text: primitivePalette.neutralLight[50],
    placeholder: primitivePalette.neutralLight[400],
    border: primitivePalette.neutralLight[700],
    borderHover: primitivePalette.neutralLight[600],
    borderFocus: primitivePalette.neutralZinc[900],
    borderError: primitivePalette.rose[500],
    focusRing: '0 0 0 2px rgba(17, 24, 39, 0.15)',
    disabledBackground: 'rgba(0, 0, 0, 0.02)',
    disabledText: primitivePalette.neutralLight[500],
  },

  card: {
    background: '#FFFFFF',
    border: primitivePalette.neutralLight[700],
    borderHover: primitivePalette.neutralLight[600],
    shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.06)',
    radius: '12px',
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
      background: primitivePalette.blue.subtleLight,
      text: primitivePalette.blue[600],
      border: primitivePalette.blue.borderLight,
    },
    neutral: {
      background: 'rgba(0, 0, 0, 0.05)',
      text: primitivePalette.neutralLight[300],
      border: 'rgba(0, 0, 0, 0.08)',
    },
    primary: {
      background: 'rgba(15, 23, 42, 0.08)',
      text: primitivePalette.neutralZinc[900],
      border: 'rgba(15, 23, 42, 0.20)',
    },
  },

  table: {
    header: {
      background: primitivePalette.neutralLight[800],
      text: primitivePalette.neutralLight[300],
      border: primitivePalette.neutralLight[700],
    },
    row: {
      background: '#FFFFFF',
      backgroundHover: 'rgba(0, 0, 0, 0.02)',
      backgroundSelected: 'rgba(17, 24, 39, 0.05)',
      border: 'rgba(0, 0, 0, 0.05)',
      text: primitivePalette.neutralLight[50],
    },
  },

  modal: {
    background: '#FFFFFF',
    overlay: 'rgba(15, 23, 42, 0.45)',
    border: primitivePalette.neutralLight[700],
    shadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    radius: '14px',
  },

  drawer: {
    background: '#FFFFFF',
    border: primitivePalette.neutralLight[700],
    shadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },

  sidebar: {
    background: '#FFFFFF',
    border: primitivePalette.neutralLight[700],
    item: {
      backgroundHover: 'rgba(0, 0, 0, 0.03)',
      backgroundActive: 'rgba(17, 24, 39, 0.06)',
      text: primitivePalette.neutralLight[300],
      textActive: primitivePalette.neutralZinc[900],
      borderActive: primitivePalette.neutralZinc[900],
    },
  },

  header: {
    background: 'rgba(255, 255, 255, 0.92)',
    border: primitivePalette.neutralLight[700],
    text: primitivePalette.neutralLight[50],
  },

  navigation: {
    background: '#FFFFFF',
    itemActive: primitivePalette.neutralZinc[900],
    itemHover: 'rgba(0, 0, 0, 0.04)',
    itemInactive: primitivePalette.neutralLight[400],
    border: primitivePalette.neutralLight[700],
  },
};
