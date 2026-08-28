import { primitivePalette, primitiveShadow } from '../primitives.js';
import { ThemeDefinition } from '../tokens.js';

export const botanicalTheme: ThemeDefinition = {
  id: 'botanical',
  name: 'Emerald Botanical',
  appearance: 'dark',

  color: {
    background: {
      canvas: primitivePalette.neutralForest[950],   // #060B09
      surface: primitivePalette.neutralForest[850],  // #0F1815
      elevated: primitivePalette.neutralForest[800], // #15221E
      inset: primitivePalette.neutralForest[900],    // #0A110E
      inverse: primitivePalette.neutralForest[50],   // #F2F7F4
      overlay: 'rgba(0, 0, 0, 0.78)',
    },
    text: {
      primary: primitivePalette.neutralForest[50],   // #F2F7F4 (18.2:1 on canvas)
      secondary: primitivePalette.neutralForest[300],// #9FB5AC (8.5:1 on surface)
      muted: primitivePalette.neutralForest[400],    // #809B90 (6.1:1 on surface - WCAG AA Pass)
      inverse: primitivePalette.neutralForest[950],  // #060B09
      disabled: primitivePalette.neutralForest[600], // #3E554C
    },
    border: {
      subtle: 'rgba(255, 255, 255, 0.05)',
      default: 'rgba(255, 255, 255, 0.08)',
      strong: 'rgba(255, 255, 255, 0.16)',
      focus: primitivePalette.emeraldGreen[500],      // #10B981
      error: primitivePalette.rose[400],
    },
    action: {
      primary: primitivePalette.emeraldGreen[500],     // #10B981
      primaryHover: primitivePalette.emeraldGreen[600],// #059669
      primaryActive: primitivePalette.emeraldGreen[700],// #047857
      primarySubtle: 'rgba(16, 185, 129, 0.12)',
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
      selected: 'rgba(16, 185, 129, 0.10)',
      focusRing: '0 0 0 2px rgba(16, 185, 129, 0.30)',
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
    focus: '0 0 0 2px rgba(16, 185, 129, 0.30)',
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
      background: primitivePalette.emeraldGreen[500],
      backgroundHover: primitivePalette.emeraldGreen[600],
      backgroundActive: primitivePalette.emeraldGreen[700],
      text: '#01140E',
      border: 'transparent',
      shadow: '0 4px 14px rgba(16, 185, 129, 0.25)',
    },
    secondary: {
      background: 'rgba(255, 255, 255, 0.06)',
      backgroundHover: 'rgba(255, 255, 255, 0.10)',
      backgroundActive: 'rgba(255, 255, 255, 0.14)',
      text: primitivePalette.neutralForest[50],
      border: 'rgba(255, 255, 255, 0.08)',
    },
    ghost: {
      background: 'transparent',
      backgroundHover: 'rgba(255, 255, 255, 0.05)',
      backgroundActive: 'rgba(255, 255, 255, 0.09)',
      text: primitivePalette.neutralForest[300],
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
      text: primitivePalette.neutralForest[600],
      border: 'rgba(255, 255, 255, 0.04)',
    },
  },

  input: {
    background: primitivePalette.neutralForest[900],
    text: primitivePalette.neutralForest[50],
    placeholder: primitivePalette.neutralForest[400],
    border: 'rgba(255, 255, 255, 0.08)',
    borderHover: 'rgba(255, 255, 255, 0.16)',
    borderFocus: primitivePalette.emeraldGreen[500],
    borderError: primitivePalette.rose[400],
    focusRing: '0 0 0 2px rgba(16, 185, 129, 0.25)',
    disabledBackground: 'rgba(255, 255, 255, 0.02)',
    disabledText: primitivePalette.neutralForest[600],
  },

  card: {
    background: primitivePalette.neutralForest[850],
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
      text: primitivePalette.neutralForest[300],
      border: 'rgba(255, 255, 255, 0.08)',
    },
    primary: {
      background: 'rgba(16, 185, 129, 0.12)',
      text: primitivePalette.emeraldGreen[300],
      border: 'rgba(16, 185, 129, 0.30)',
    },
  },

  table: {
    header: {
      background: primitivePalette.neutralForest[900],
      text: primitivePalette.neutralForest[300],
      border: 'rgba(255, 255, 255, 0.06)',
    },
    row: {
      background: primitivePalette.neutralForest[850],
      backgroundHover: 'rgba(255, 255, 255, 0.03)',
      backgroundSelected: 'rgba(16, 185, 129, 0.08)',
      border: 'rgba(255, 255, 255, 0.05)',
      text: primitivePalette.neutralForest[50],
    },
  },

  modal: {
    background: primitivePalette.neutralForest[800],
    overlay: 'rgba(0, 0, 0, 0.78)',
    border: 'rgba(255, 255, 255, 0.12)',
    shadow: primitiveShadow.lg,
    radius: '14px',
  },

  drawer: {
    background: primitivePalette.neutralForest[800],
    border: 'rgba(255, 255, 255, 0.08)',
    shadow: primitiveShadow.lg,
  },

  sidebar: {
    background: primitivePalette.neutralForest[850],
    border: 'rgba(255, 255, 255, 0.06)',
    item: {
      backgroundHover: 'rgba(255, 255, 255, 0.04)',
      backgroundActive: 'rgba(16, 185, 129, 0.12)',
      text: primitivePalette.neutralForest[300],
      textActive: primitivePalette.emeraldGreen[500],
      borderActive: primitivePalette.emeraldGreen[500],
    },
  },

  header: {
    background: 'rgba(15, 24, 21, 0.88)',
    border: 'rgba(255, 255, 255, 0.06)',
    text: primitivePalette.neutralForest[50],
  },

  navigation: {
    background: primitivePalette.neutralForest[850],
    itemActive: primitivePalette.emeraldGreen[500],
    itemHover: 'rgba(255, 255, 255, 0.04)',
    itemInactive: primitivePalette.neutralForest[400],
    border: 'rgba(255, 255, 255, 0.06)',
  },
};
